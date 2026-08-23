import { Resend } from "resend";

/**
 * Email is optional. Without RESEND_API_KEY the app still works end to end —
 * messages are written to the server log instead, so a missing key can never
 * break a deployment or a cron run.
 */
export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ delivered: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL || "DSMS <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(`[email:dry-run] to=${opts.to.join(",")} subject="${opts.subject}"`);
    return { delivered: false, reason: "RESEND_API_KEY not configured" };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
    return { delivered: true };
  } catch (error) {
    console.error("[email:error]", error);
    return { delivered: false, reason: String(error) };
  }
}

export function reminderTemplate(opts: {
  heading: string;
  intro: string;
  bullets: string[];
  demoUrl: string;
  ctaLabel: string;
}): string {
  const items = opts.bullets.map((b) => `<li style="margin-bottom:6px;">${b}</li>`).join("");
  return `
  <div style="font-family:Georgia,serif;color:#333333;max-width:560px;">
    <h2 style="font-family:Helvetica,Arial,sans-serif;color:#FF601F;font-size:18px;margin:0 0 12px;">
      ${opts.heading}
    </h2>
    <p style="margin:0 0 12px;">${opts.intro}</p>
    <ul style="padding-left:18px;margin:0 0 16px;">${items}</ul>
    <a href="${opts.demoUrl}"
       style="display:inline-block;background:#FF601F;color:#ffffff;text-decoration:none;
              padding:10px 18px;border-radius:5px;font-family:Helvetica,Arial,sans-serif;
              font-size:14px;font-weight:bold;">
      ${opts.ctaLabel}
    </a>
    <p style="color:#999999;font-size:12px;margin-top:20px;border-top:1px solid #D9D9D9;padding-top:10px;">
      Automated reminder from the Demo Schedule &amp; Management System.
    </p>
  </div>`;
}
