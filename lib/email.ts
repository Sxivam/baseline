// Resend client wrapper — fetch-based, no SDK dependency. Server-only.
//
// Setup:
//   1. Sign up at resend.com (free tier: 100/day, 3000/month).
//   2. Create an API key → drop into `RESEND_API_KEY` in .env.local + Vercel.
//   3. By default we send from `onboarding@resend.dev`, which Resend lets you
//      use without verifying a domain. To send from hello@baseline.health
//      (or similar), verify your domain in the Resend dashboard and set
//      `RESEND_FROM_ADDRESS=Baseline <hello@your-domain.com>`.

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export function hasResendKey(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set" };

  const fromName = args.fromName || "Baseline";
  const from =
    process.env.RESEND_FROM_ADDRESS || `${fromName} <onboarding@resend.dev>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.subject,
        html: args.html,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Resend ${res.status}: ${text.slice(0, 240)}`,
      };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
