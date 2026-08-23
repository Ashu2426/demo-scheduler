"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { formatRange } from "@/lib/time";

export type IssueFormState = { error?: string; success?: string };

const issueSchema = z.object({
  demoId: z.string().min(1),
  title: z.string().trim().min(1, "Give the issue a short title."),
  description: z.string().trim().optional(),
  severity: z.enum(["BLOCKS_DEMO", "HIGH", "MEDIUM", "LOW"]),
  assigneeId: z.string().min(1, "Choose who should fix this."),
});

export async function createIssue(
  _prev: IssueFormState,
  formData: FormData,
): Promise<IssueFormState> {
  const session = await requireSession();

  const parsed = issueSchema.safeParse({
    demoId: formData.get("demoId"),
    title: formData.get("title"),
    description: formData.get("description"),
    severity: formData.get("severity"),
    assigneeId: formData.get("assigneeId"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const demo = await db.demo.findUnique({
    where: { id: data.demoId },
    include: { product: true },
  });
  if (!demo) return { error: "Demo not found." };

  const issue = await db.issue.create({
    data: {
      title: data.title,
      description: data.description || null,
      severity: data.severity,
      assigneeId: data.assigneeId,
      reportedById: session.userId,
      demoId: demo.id,
      productId: demo.productId,
    },
    include: { assignee: true },
  });

  // Only the assignee is notified — issue traffic stays off everyone else's inbox.
  await sendEmail({
    to: [issue.assignee.email],
    subject: `Issue assigned to you: ${issue.title}`,
    html: `
      <div style="font-family:Georgia,serif;color:#333333;">
        <p><b>${session.name}</b> assigned you an issue on an upcoming demo.</p>
        <p style="margin:12px 0;padding:12px;background:#FFF5F0;border-left:3px solid #FF601F;">
          <b>${issue.title}</b><br/>
          ${demo.product.name}<br/>
          Demo: ${formatRange(demo.startTime, demo.endTime)}
        </p>
        <p>${issue.description ?? ""}</p>
      </div>`,
  });

  revalidatePath(`/demos/${demo.id}`);
  revalidatePath("/issues");
  revalidatePath("/demos");
  return { success: `Issue logged and ${issue.assignee.name} has been notified.` };
}

export async function updateIssueStatus(formData: FormData) {
  const session = await requireSession();
  const issueId = String(formData.get("issueId"));
  const status = String(formData.get("status")) as "OPEN" | "IN_PROGRESS" | "RESOLVED";

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: { demo: { include: { owner: true } } },
  });
  if (!issue) return;

  // The assignee, the owner of the demo it blocks, and admins may update it.
  const allowed =
    session.role === "ADMIN" ||
    session.userId === issue.assigneeId ||
    session.userId === issue.demo.ownerId;
  if (!allowed) return;

  await db.issue.update({
    where: { id: issueId },
    data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
  });

  // Close the loop for the demo owner when the blocker clears.
  if (status === "RESOLVED" && session.userId !== issue.demo.ownerId) {
    await sendEmail({
      to: [issue.demo.owner.email],
      subject: `Resolved: ${issue.title}`,
      html: `<p style="font-family:Georgia,serif;">
               <b>${issue.title}</b> has been marked resolved by ${session.name}.
             </p>`,
    });
  }

  revalidatePath(`/demos/${issue.demoId}`);
  revalidatePath("/issues");
  revalidatePath("/demos");
}
