// POST /api/send-nudge — send a real nudge email via Resend.
//
// Input: the email address to send to, the LLM-generated payload (or static
// fallback), the projection numbers, and the user's first name. The route
// renders the HTML email server-side (no LLM call here — that already
// happened upstream via /api/generate-nudge) and hands it to Resend.
//
// Failure modes (each returns a clean 4xx/5xx so the UI can show a toast):
//   - Invalid email          → 400
//   - Missing payload fields → 400
//   - RESEND_API_KEY unset   → 503 (with `configRequired: true`)
//   - Resend rejects         → 502
//   - Network error          → 500

import { hasResendKey, sendEmail } from "@/lib/email";
import {
  renderNudgeEmailHtml,
  type NudgeProjection,
} from "@/lib/email-template";
import type { NudgePayload } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface SendNudgeRequest {
  email: string;
  payload: NudgePayload;
  projection: NudgeProjection;
  firstName: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: SendNudgeRequest;
  try {
    body = (await request.json()) as SendNudgeRequest;
  } catch {
    return Response.json(
      { ok: false, error: "Couldn't parse the request body." },
      { status: 400 },
    );
  }

  if (!body.email || !EMAIL_RE.test(body.email)) {
    return Response.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!body.payload?.hero_line || !body.projection?.markerFullName) {
    return Response.json(
      { ok: false, error: "Missing nudge payload — try reloading the preview." },
      { status: 400 },
    );
  }

  if (!hasResendKey()) {
    return Response.json(
      {
        ok: false,
        configRequired: true,
        error:
          "RESEND_API_KEY isn't set. Add it to .env.local (local) or to the Vercel project's env vars (production), then redeploy.",
      },
      { status: 503 },
    );
  }

  const html = renderNudgeEmailHtml({
    payload: body.payload,
    projection: body.projection,
    firstName: body.firstName || "there",
  });

  const result = await sendEmail({
    to: body.email,
    subject: body.payload.subject,
    html,
  });

  if (!result.ok) {
    return Response.json(
      { ok: false, error: result.error || "Email send failed." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true, id: result.id });
}
