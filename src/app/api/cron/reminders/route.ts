import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { reminderTemplate, sendEmail } from "@/lib/email";
import { daysUntil, formatRange } from "@/lib/time";

// Prisma needs the Node runtime; this must never be pre-rendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs once daily (see vercel.json). Sends the T-3 day "confirm client changes"
 * reminder and the T-1 day "test the product" reminder.
 *
 * ReminderLog has a unique (demoId, type) constraint, so a demo can never be
 * emailed the same reminder twice even if the cron fires more than once.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const now = new Date();
  const horizon = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const demos = await db.demo.findMany({
    where: { status: "SCHEDULED", startTime: { gte: now, lte: horizon } },
    include: {
      product: true,
      office: true,
      owner: true,
      reminders: true,
      issues: { where: { status: { not: "RESOLVED" } }, include: { assignee: true } },
    },
  });

  const sent: string[] = [];

  for (const demo of demos) {
    const days = daysUntil(demo.startTime, now);
    const type = days === 3 ? "T_MINUS_3_DAYS" : days === 1 ? "T_MINUS_1_DAY" : null;
    if (!type) continue;

    if (demo.reminders.some((r) => r.type === type)) continue;

    // Notify the owner plus anyone already working an issue on this demo.
    const recipients = new Set<string>([demo.owner.email]);
    demo.issues.forEach((i) => recipients.add(i.assignee.email));

    const html =
      type === "T_MINUS_3_DAYS"
        ? reminderTemplate({
            heading: `Demo in 3 days — ${demo.product.name}`,
            intro: `Your demo for <b>${demo.clientName}</b> is on ${formatRange(demo.startTime, demo.endTime)} (${demo.office.name}).`,
            bullets: [
              "Any client-specific data or config changes needed before then?",
              "Confirm the environment is set up the way this client expects.",
            ],
            demoUrl: `${baseUrl}/demos/${demo.id}`,
            ctaLabel: "Review Demo",
          })
        : reminderTemplate({
            heading: `Demo tomorrow — test ${demo.product.name} today`,
            intro: `Your demo for <b>${demo.clientName}</b> is tomorrow, ${formatRange(demo.startTime, demo.endTime)}. Please run through it now.`,
            bullets: [
              "Login works on the demo environment",
              "Key workflows run end to end",
              "Demo data looks correct",
              "<b>Found a problem? Log it now so it can be assigned and fixed in time.</b>",
            ],
            demoUrl: `${baseUrl}/demos/${demo.id}`,
            ctaLabel: "Open Pre-Demo Check",
          });

    const result = await sendEmail({
      to: [...recipients],
      subject:
        type === "T_MINUS_3_DAYS"
          ? `Reminder — ${demo.clientName} demo in 3 days, confirm any changes`
          : `Test ${demo.product.name} today — demo tomorrow`,
      html,
    });

    await db.reminderLog.create({ data: { demoId: demo.id, type } });
    sent.push(`${demo.id}:${type}:${result.delivered ? "sent" : "logged"}`);
  }

  return NextResponse.json({ ok: true, checked: demos.length, sent });
}
