// HTML renderer for the Baseline nudge email. Ported from the handoff
// `nudge-email.html` template (Gmail / Outlook / Apple Mail tested) into a
// pure-TS function. Inline CSS only — the email clients that matter strip
// <style> blocks.

import type { NudgePayload } from "./types";

export interface NudgeProjection {
  markerFullName: string;
  unit: string;
  threshold: number;
  lastDate: string; // formatted, e.g. "3 May 2026"
  lastValue: number | string;
  todayLabel: string; // e.g. "Today"
  todayValue: number | string;
  todayDelta: string; // e.g. "−1.1 since"
  projectedLabel: string; // e.g. "Late October"
  projectedValue: number | string;
  projectedDelta: string;
}

export interface RenderNudgeOpts {
  payload: NudgePayload;
  projection: NudgeProjection;
  firstName: string;
  preheader?: string;
  appUrl?: string;
  rescheduleUrl?: string;
  pauseUrl?: string;
  unsubscribeUrl?: string;
  ctaPrimaryUrl?: string;
  ctaSecondaryUrl?: string;
}

function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderNudgeEmailHtml(opts: RenderNudgeOpts): string {
  const { payload, projection, preheader } = opts;
  const appUrl = opts.appUrl ?? "https://baseline.health";
  const rescheduleUrl = opts.rescheduleUrl ?? appUrl;
  const pauseUrl = opts.pauseUrl ?? appUrl;
  const unsubscribeUrl = opts.unsubscribeUrl ?? appUrl;
  const ctaPrimaryUrl = opts.ctaPrimaryUrl ?? appUrl;
  const ctaSecondaryUrl = opts.ctaSecondaryUrl ?? appUrl;

  const heroLines = payload.hero_line.split("\n");
  const heroTop = heroLines[0] || "";
  const heroBottom = heroLines[1] || "";

  const signoffHtml = payload.signoff
    .split("\n")
    .map((ln) => esc(ln))
    .join("<br/>");

  const preheaderText =
    preheader ||
    payload.context_paragraph.replace(/\s+/g, " ").slice(0, 90).trim();

  const thingsHtml = payload.three_things
    .map(
      (t) => `
      <tr><td style="padding:0 0 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eeebe3;border-radius:16px;border:1px solid rgba(183,198,194,0.4);">
          <tr>
            <td width="60" align="center" style="padding:12px 0 12px 12px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr><td width="32" height="32" align="center" valign="middle" style="background:#ffffff;border:1px solid rgba(183,198,194,0.4);border-radius:99px;font-size:15px;">${esc(t.emoji)}</td></tr>
              </table>
            </td>
            <td style="padding:12px 16px 12px 12px;font-family:'Nunito',sans-serif;font-size:14px;font-weight:700;color:#171e19;">${esc(t.text)}</td>
          </tr>
        </table>
      </td></tr>
    `,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>${esc(payload.subject)}</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0; padding:0; width:100% !important; height:100% !important; }
  @media screen and (max-width:600px) {
    .container { width:100% !important; padding:0 16px !important; }
    .px-40     { padding-left:24px !important; padding-right:24px !important; }
    .h-hero    { font-size:28px !important; line-height:1.15 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#eeebe3;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#171e19;">

<div style="display:none;font-size:1px;color:#eeebe3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheaderText)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eeebe3;">
<tr><td align="center" style="padding:32px 16px;">

  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:32px;overflow:hidden;border:1px solid rgba(183,198,194,0.35);">

    <!-- sender row -->
    <tr><td class="px-40" style="padding:28px 40px 22px;border-bottom:1px solid rgba(183,198,194,0.3);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="48" style="width:48px;vertical-align:middle;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#171e19;border-radius:12px;">
              <tr><td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;font-family:'Nunito',sans-serif;font-weight:900;font-size:21px;color:#ffffff;line-height:1;">
                b<span style="color:#ca0013;">.</span>
              </td></tr>
            </table>
          </td>
          <td style="padding-left:14px;vertical-align:middle;">
            <div style="font-family:'Nunito',sans-serif;font-size:15px;font-weight:800;color:#171e19;line-height:1.2;">Baseline</div>
            <div style="font-family:'Nunito',sans-serif;font-size:12px;font-weight:500;color:#8a948f;margin-top:2px;">tracking, not diagnosis</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- hero -->
    <tr><td class="px-40" style="padding:32px 40px 0;">
      <p style="margin:0;font-family:'Nunito',sans-serif;font-size:16px;font-weight:500;color:#3a443e;line-height:1.5;">
        ${esc(payload.greeting)}
      </p>
      <h1 class="h-hero" style="margin:14px 0 0;font-family:'Nunito',sans-serif;font-size:32px;font-weight:900;letter-spacing:-0.02em;line-height:1.15;color:#171e19;">
        ${esc(heroTop)}<br/>
        <span style="color:#ca0013;">${esc(heroBottom)}</span>
      </h1>
    </td></tr>

    <!-- context -->
    <tr><td class="px-40" style="padding:20px 40px 0;">
      <p style="margin:0;font-family:'Nunito',sans-serif;font-size:15px;font-weight:500;color:#3a443e;line-height:1.6;">
        ${esc(payload.context_paragraph)}
      </p>
      <p style="margin:14px 0 0;font-family:'Nunito',sans-serif;font-size:15px;font-weight:500;color:#3a443e;line-height:1.6;">
        ${esc(payload.projection_intro)}
      </p>
    </td></tr>

    <!-- projection table -->
    <tr><td class="px-40" style="padding:18px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eeebe3;border-radius:18px;overflow:hidden;border:1px solid rgba(183,198,194,0.4);">
        <tr><td colspan="4" style="background:#171e19;color:#ffffff;padding:12px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:'Nunito',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.12em;color:#ffffff;">${esc(projection.markerFullName.toUpperCase())} · ${esc(projection.unit)}</td>
              <td align="right" style="font-family:'Nunito',sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);">Sufficiency · ${esc(projection.threshold)}</td>
            </tr>
          </table>
        </td></tr>
        <tr>
          <td style="padding:14px 18px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;color:#171e19;">Last reading</td>
          <td style="padding:14px 0;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;color:#8a948f;">${esc(projection.lastDate)}</td>
          <td align="right" style="padding:14px 0;font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;color:#171e19;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;">${esc(projection.lastValue)}</td>
          <td style="padding:14px 18px;width:90px;"></td>
        </tr>
        <tr><td colspan="4" style="border-top:1px dashed rgba(183,198,194,0.5);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:14px 18px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;color:#171e19;">${esc(projection.todayLabel)}</td>
          <td style="padding:14px 0;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;color:#8a948f;">Estimate today</td>
          <td align="right" style="padding:14px 0;font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;color:#ca0013;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;">~${esc(projection.todayValue)}</td>
          <td style="padding:14px 18px;width:90px;font-family:'Nunito',sans-serif;font-size:11px;font-weight:700;color:#8a948f;text-align:right;">${esc(projection.todayDelta)}</td>
        </tr>
        <tr><td colspan="4" style="border-top:1px dashed rgba(183,198,194,0.5);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:14px 18px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;color:#171e19;">Projected</td>
          <td style="padding:14px 0;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;color:#8a948f;">${esc(projection.projectedLabel)}</td>
          <td align="right" style="padding:14px 0;font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;color:#ca0013;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;">~${esc(projection.projectedValue)}</td>
          <td style="padding:14px 18px;width:90px;font-family:'Nunito',sans-serif;font-size:11px;font-weight:700;color:#8a948f;text-align:right;">${esc(projection.projectedDelta)}</td>
        </tr>
      </table>
    </td></tr>

    <!-- three things -->
    <tr><td class="px-40" style="padding:22px 40px 0;">
      <p style="margin:0;font-family:'Nunito',sans-serif;font-size:15px;font-weight:500;color:#3a443e;line-height:1.6;">
        Three small things, all in your control:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
        ${thingsHtml}
      </table>
    </td></tr>

    <!-- one-question CTA -->
    <tr><td class="px-40" style="padding:24px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#171e19;border-radius:28px;">
        <tr><td style="padding:24px;">
          <div style="font-family:'Nunito',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.12em;color:rgba(255,255,255,0.6);">${esc(payload.question_card.label)}</div>
          <div style="font-family:'Nunito',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.01em;color:#ffffff;margin-top:6px;line-height:1.2;">${esc(payload.question_card.text)}</div>
          <div style="padding-top:16px;">
            <a href="${esc(ctaPrimaryUrl)}" style="display:inline-block;padding:12px 22px;background:#ca0013;color:#ffffff;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;text-decoration:none;border-radius:99px;margin-right:8px;">
              Yes, remind me &nbsp;→
            </a>
            <a href="${esc(ctaSecondaryUrl)}" style="display:inline-block;padding:12px 22px;background:transparent;color:#ffffff;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;text-decoration:none;border-radius:99px;border:1px solid rgba(255,255,255,0.25);">
              Not yet
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>

    <!-- signoff -->
    <tr><td class="px-40" style="padding:22px 40px 0;">
      <p style="margin:0;font-family:'Nunito',sans-serif;font-size:14px;font-weight:500;color:#3a443e;line-height:1.6;">
        ${signoffHtml}
      </p>
    </td></tr>

    <!-- disclaimer -->
    <tr><td class="px-40" style="padding:24px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(183,198,194,0.25);border-radius:16px;">
        <tr><td style="padding:14px 18px;font-family:'Nunito',sans-serif;font-size:12px;font-weight:500;color:#3a443e;line-height:1.5;">
          Baseline is an awareness and tracking tool, not a medical service. Always consult a qualified doctor for diagnosis or treatment.
        </td></tr>
      </table>
    </td></tr>

    <!-- footer -->
    <tr><td class="px-40" style="padding:18px 40px 28px;border-top:1px dashed rgba(183,198,194,0.5);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-family:'Nunito',sans-serif;font-size:12px;font-weight:500;color:#8a948f;">
            <a href="${esc(appUrl)}" style="color:#171e19;font-weight:900;text-decoration:none;letter-spacing:-0.01em;">Baseline<span style="color:#ca0013;">.</span></a>
            &nbsp;·&nbsp; tracking, not diagnosis
          </td>
          <td align="right" style="font-family:'Nunito',sans-serif;font-size:11px;font-weight:500;color:#8a948f;">
            <a href="${esc(rescheduleUrl)}"  style="color:#8a948f;text-decoration:none;">Reschedule</a>
            &nbsp;&middot;&nbsp;
            <a href="${esc(pauseUrl)}"       style="color:#8a948f;text-decoration:none;">Pause nudges</a>
            &nbsp;&middot;&nbsp;
            <a href="${esc(unsubscribeUrl)}" style="color:#8a948f;text-decoration:none;">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td></tr>

  </table>

</td></tr></table>
</body>
</html>`;
}
