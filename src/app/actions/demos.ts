"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEditDemo, canManageDemos, requireSession } from "@/lib/auth";
import { istInputToUtc } from "@/lib/time";

export type DemoFormState = { error?: string };

const demoSchema = z.object({
  clientName: z.string().trim().min(1, "Client name is required."),
  productId: z.string().min(1, "Select a product."),
  officeId: z.string().min(1, "Select an office."),
  start: z.string().min(1, "Start time is required."),
  end: z.string().min(1, "End time is required."),
  bufferMinutes: z.coerce.number().int().min(0).max(240),
  notes: z.string().trim().optional(),
});

/**
 * A demo blocks its environment for the meeting time plus a buffer either side.
 * Two demos conflict when those freeze windows overlap.
 */
async function findConflict(opts: {
  productId: string;
  startTime: Date;
  endTime: Date;
  bufferMinutes: number;
  excludeDemoId?: string;
}) {
  const bufferMs = opts.bufferMinutes * 60_000;
  const freezeStart = new Date(opts.startTime.getTime() - bufferMs);
  const freezeEnd = new Date(opts.endTime.getTime() + bufferMs);

  const candidates = await db.demo.findMany({
    where: {
      productId: opts.productId,
      status: "SCHEDULED",
      id: opts.excludeDemoId ? { not: opts.excludeDemoId } : undefined,
      // Cheap pre-filter; exact buffer maths happens below.
      startTime: { lt: new Date(freezeEnd.getTime() + 4 * 60 * 60_000) },
      endTime: { gt: new Date(freezeStart.getTime() - 4 * 60 * 60_000) },
    },
    include: { owner: true, office: true },
  });

  return candidates.find((other) => {
    const otherBufferMs = other.bufferMinutes * 60_000;
    const otherStart = new Date(other.startTime.getTime() - otherBufferMs);
    const otherEnd = new Date(other.endTime.getTime() + otherBufferMs);
    return freezeStart < otherEnd && freezeEnd > otherStart;
  });
}

function parseForm(formData: FormData) {
  const parsed = demoSchema.safeParse({
    clientName: formData.get("clientName"),
    productId: formData.get("productId"),
    officeId: formData.get("officeId"),
    start: formData.get("start"),
    end: formData.get("end"),
    bufferMinutes: formData.get("bufferMinutes"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message } as const;
  }

  const startTime = istInputToUtc(parsed.data.start);
  const endTime = istInputToUtc(parsed.data.end);

  if (endTime <= startTime) {
    return { error: "The end time must be after the start time." } as const;
  }

  return { data: { ...parsed.data, startTime, endTime } } as const;
}

export async function createDemo(
  _prev: DemoFormState,
  formData: FormData,
): Promise<DemoFormState> {
  const session = await requireSession();
  if (!canManageDemos(session)) return { error: "You do not have permission to create demos." };

  const parsed = parseForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { data } = parsed;

  const conflict = await findConflict({
    productId: data.productId,
    startTime: data.startTime,
    endTime: data.endTime,
    bufferMinutes: data.bufferMinutes,
  });

  if (conflict) {
    return {
      error:
        `This environment is already booked by ${conflict.owner.name} ` +
        `(${conflict.office.name}) in an overlapping window. Pick another slot.`,
    };
  }

  const demo = await db.demo.create({
    data: {
      clientName: data.clientName,
      productId: data.productId,
      officeId: data.officeId,
      ownerId: session.userId,
      startTime: data.startTime,
      endTime: data.endTime,
      bufferMinutes: data.bufferMinutes,
      notes: data.notes || null,
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/demos");
  redirect(`/demos/${demo.id}`);
}

export async function updateDemo(
  demoId: string,
  _prev: DemoFormState,
  formData: FormData,
): Promise<DemoFormState> {
  const session = await requireSession();

  const existing = await db.demo.findUnique({ where: { id: demoId } });
  if (!existing) return { error: "Demo not found." };
  if (!canEditDemo(session, existing.ownerId)) {
    return { error: "Only the demo owner or an admin can edit this demo." };
  }

  const parsed = parseForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { data } = parsed;

  const conflict = await findConflict({
    productId: data.productId,
    startTime: data.startTime,
    endTime: data.endTime,
    bufferMinutes: data.bufferMinutes,
    excludeDemoId: demoId,
  });

  if (conflict) {
    return {
      error:
        `This environment is already booked by ${conflict.owner.name} ` +
        `(${conflict.office.name}) in an overlapping window. Pick another slot.`,
    };
  }

  await db.demo.update({
    where: { id: demoId },
    data: {
      clientName: data.clientName,
      productId: data.productId,
      officeId: data.officeId,
      startTime: data.startTime,
      endTime: data.endTime,
      bufferMinutes: data.bufferMinutes,
      notes: data.notes || null,
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/demos");
  redirect(`/demos/${demoId}`);
}

export async function setDemoStatus(formData: FormData) {
  const session = await requireSession();
  const demoId = String(formData.get("demoId"));
  const status = String(formData.get("status")) as "SCHEDULED" | "COMPLETED" | "CANCELLED";

  const existing = await db.demo.findUnique({ where: { id: demoId } });
  if (!existing || !canEditDemo(session, existing.ownerId)) return;

  await db.demo.update({ where: { id: demoId }, data: { status } });

  revalidatePath("/calendar");
  revalidatePath("/demos");
  revalidatePath(`/demos/${demoId}`);
}
