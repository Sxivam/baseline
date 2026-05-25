"use client";

// Nudge email preview — renders the transactional email populated from
// /api/generate-nudge (Claude copy, §7-gated) over the locally-computed
// projection. This is the loop closing.

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { MARKERS } from "@/lib/markers";
import { buildForecast } from "@/lib/forecast";
import { buildNudgeInput } from "@/lib/nudge";
import { DISCLAIMER_FULL } from "@/lib/copy";
import { formatDate } from "@/lib/format";
import { Disclaimer, Icon, Monogram, Wordmark } from "@/components/ui";
import type { NudgePayload } from "@/lib/types";
import type { NudgeProjection } from "@/lib/email-template";

type SendState = "idle" | "sending" | "sent" | "configRequired" | "error";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Row {
  label: string;
  date: string;
  value: string;
  delta: string;
  red: boolean;
}

export default function NudgePreviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const markerId = params.id;
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const parse = useBaseline((s) => s.parse);
  const nudges = useBaseline((s) => s.nudges);
  const setNudge = useBaseline((s) => s.setNudge);

  const [payload, setPayload] = useState<NudgePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  // "Send to my inbox" state — independent from the copy-generation flow.
  const [email, setEmail] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || started.current) return;
    if (!profile) {
      router.replace("/start");
      return;
    }
    if (!parse) {
      router.replace("/upload");
      return;
    }
    const reading = parse.markers.find((m) => m.markerId === markerId);
    if (!reading || !MARKERS[markerId]?.inV1Forecast) {
      router.replace("/dashboard");
      return;
    }
    started.current = true;

    const cached = nudges[markerId];
    if (cached) {
      setPayload(cached);
      setLoading(false);
      return;
    }

    const testDate = parse.testDate || new Date().toISOString().slice(0, 10);
    const forecast = buildForecast(markerId, reading.value, new Date(testDate), profile);
    const input = buildNudgeInput(markerId, reading.value, testDate, forecast, profile);

    fetch("/api/generate-nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.hero_line === "string") {
          setPayload(data as NudgePayload);
          setNudge(markerId, data as NudgePayload);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [hydrated, markerId, profile, parse, nudges, router, setNudge]);

  if (!hydrated || !profile || !parse) {
    return <Splash />;
  }

  const reading = parse.markers.find((m) => m.markerId === markerId);
  const def = MARKERS[markerId];
  if (!reading || !def?.inV1Forecast || !def.thresholds) {
    return <Splash />;
  }

  const testDate = parse.testDate || new Date().toISOString().slice(0, 10);
  const forecast = buildForecast(markerId, reading.value, new Date(testDate), profile);
  const input = buildNudgeInput(markerId, reading.value, testDate, forecast, profile);
  const m = input.marker;

  const delta = Math.round((m.current_estimate - m.last_value) * 10) / 10;
  const rows: Row[] = [
    { label: "Last reading", date: formatDate(testDate), value: `${m.last_value}`, delta: "", red: false },
    {
      label: "Estimate today",
      date: "Today",
      value: `~${m.current_estimate}`,
      delta: delta === 0 ? "" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} since`,
      red: true,
    },
    {
      label: "Projected",
      date: m.projected_date.charAt(0).toUpperCase() + m.projected_date.slice(1),
      value: `~${m.projected_value}`,
      delta: forecast.crossingDate ? "crosses the line" : "in the window",
      red: true,
    },
  ];

  // Same shape the email-template renderer wants — see lib/email-template.ts.
  const projection: NudgeProjection = {
    markerFullName: def.fullName,
    unit: def.unit,
    threshold: m.threshold,
    lastDate: formatDate(testDate),
    lastValue: m.last_value,
    todayLabel: "Today",
    todayValue: m.current_estimate,
    todayDelta:
      delta === 0 ? "" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} since`,
    projectedLabel:
      m.projected_date.charAt(0).toUpperCase() + m.projected_date.slice(1),
    projectedValue: m.projected_value,
    projectedDelta: forecast.crossingDate ? "crosses the line" : "in the window",
  };

  const emailValid = EMAIL_RE.test(email.trim());
  const sendDisabled = !payload || !emailValid || sendState === "sending";

  async function handleSend() {
    if (sendDisabled || !payload || !profile) return;
    setSendState("sending");
    setSendError(null);
    setSentId(null);
    try {
      const res = await fetch("/api/send-nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          payload,
          projection,
          firstName: profile.firstName,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
        configRequired?: boolean;
      };
      if (res.ok && data.ok) {
        setSendState("sent");
        setSentId(data.id ?? null);
      } else if (res.status === 503 && data.configRequired) {
        setSendState("configRequired");
        setSendError(data.error ?? null);
      } else {
        setSendState("error");
        setSendError(data.error ?? `Send failed (status ${res.status}).`);
      }
    } catch (err) {
      setSendState("error");
      setSendError(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: tok.paper }}>
      {/* preview chrome */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${tok.sageSoft}`,
          background: "rgba(238,235,227,.9)",
          backdropFilter: "blur(8px)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push(`/forecast/${markerId}`)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 99,
            border: `1px solid ${tok.sageSoft}`,
            background: tok.white,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 600,
            color: tok.ink,
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <div style={{ textAlign: "center" }}>
          <div className="hi-label">Preview</div>
          <div style={{ fontFamily: tok.font, fontSize: 14, fontWeight: 800, color: tok.ink }}>
            {forecast.nudgeDate ? `${formatDate(forecast.nudgeDate)} nudge` : "Nudge email"}
          </div>
        </div>
        <Wordmark size={15} />
      </div>

      <div style={{ padding: "26px 16px 60px", display: "flex", justifyContent: "center" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              padding: "80px 0",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 99,
                border: `3px solid ${tok.sageMid}`,
                borderTopColor: tok.red,
                animation: "bl-spin 0.8s linear infinite",
              }}
            />
            <span style={{ fontFamily: tok.font, fontSize: 14, fontWeight: 800, color: tok.ink }}>
              Writing your nudge…
            </span>
          </div>
        ) : payload ? (
          <div
            style={{
              width: "100%",
              maxWidth: 600,
              background: tok.white,
              borderRadius: 28,
              border: `1px solid ${tok.sageSoft}`,
              boxShadow: tok.shadow,
              overflow: "hidden",
              animation: "bl-fade-up 0.3s ease-out",
            }}
          >
            <div style={{ padding: "26px 30px 40px" }}>
              {/* sender */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${tok.sageSoft}`,
                }}
              >
                <Monogram size={42} radius={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: tok.font, fontSize: 15, fontWeight: 800, color: tok.ink }}>
                      Baseline
                    </span>
                    <span style={{ fontFamily: tok.font, fontSize: 12, color: tok.mute }}>
                      &lt;hello@baseline.health&gt;
                    </span>
                  </div>
                  <div style={{ fontFamily: tok.font, fontSize: 12, color: tok.mute, marginTop: 2 }}>
                    to {profile.firstName} · 9:02 AM
                  </div>
                </div>
              </div>

              {/* greeting + hero */}
              <p style={{ fontFamily: tok.font, fontSize: 16, fontWeight: 500, color: tok.ink2, margin: "22px 0 0" }}>
                {payload.greeting}
              </p>
              <h1
                style={{
                  fontFamily: tok.font,
                  fontSize: 31,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.16,
                  margin: "12px 0 0",
                  color: tok.ink,
                }}
              >
                {payload.hero_line.split("\n").map((ln, i) => (
                  <span key={i} style={{ color: i === 0 ? tok.ink : tok.red }}>
                    {ln}
                    {i === 0 && <br />}
                  </span>
                ))}
              </h1>

              {/* context */}
              <p
                style={{
                  fontFamily: tok.font,
                  fontSize: 15,
                  fontWeight: 500,
                  color: tok.ink2,
                  lineHeight: 1.6,
                  margin: "18px 0 0",
                }}
              >
                {payload.context_paragraph}
              </p>
              <p
                style={{
                  fontFamily: tok.font,
                  fontSize: 15,
                  fontWeight: 500,
                  color: tok.ink2,
                  lineHeight: 1.6,
                  margin: "14px 0 0",
                }}
              >
                {payload.projection_intro}
              </p>

              {/* projection table */}
              <div
                style={{
                  marginTop: 16,
                  borderRadius: 18,
                  border: `1px solid ${tok.sageSoft}`,
                  background: tok.paper,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: tok.ink,
                    color: tok.white,
                    padding: "11px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
                    {def.fullName.toUpperCase()} · {def.unit}
                  </span>
                  <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>
                    Sufficiency · {m.threshold}
                  </span>
                </div>
                {rows.map((r, i) => (
                  <div
                    key={r.label}
                    style={{
                      padding: "13px 16px",
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      alignItems: "center",
                      gap: 12,
                      borderTop: i > 0 ? `1px dashed ${tok.sage}80` : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: tok.font, fontSize: 13, fontWeight: 800, color: tok.ink }}>
                        {r.label}
                      </div>
                      <div style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: tok.mute, marginTop: 1 }}>
                        {r.date}
                      </div>
                    </div>
                    <span
                      className="hi-num"
                      style={{
                        fontFamily: tok.font,
                        fontSize: 21,
                        fontWeight: 900,
                        color: r.red ? tok.red : tok.ink,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {r.value}
                    </span>
                    <span
                      style={{
                        fontFamily: tok.font,
                        fontSize: 10,
                        fontWeight: 700,
                        color: tok.mute,
                        minWidth: 80,
                        textAlign: "right",
                      }}
                    >
                      {r.delta}
                    </span>
                  </div>
                ))}
              </div>

              {/* three things */}
              <p
                style={{
                  fontFamily: tok.font,
                  fontSize: 15,
                  fontWeight: 500,
                  color: tok.ink2,
                  margin: "20px 0 0",
                }}
              >
                Three small things, all in your control:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {payload.three_things.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 14px",
                      borderRadius: 16,
                      background: tok.paper,
                      border: `1px solid ${tok.sageSoft}`,
                    }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 99,
                        background: tok.white,
                        border: `1px solid ${tok.sageSoft}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        flex: "0 0 auto",
                      }}
                    >
                      {t.emoji}
                    </span>
                    <span style={{ fontFamily: tok.font, fontSize: 14, fontWeight: 700, color: tok.ink }}>
                      {t.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* one-question CTA */}
              <div
                style={{
                  marginTop: 22,
                  padding: 22,
                  borderRadius: 24,
                  background: tok.ink,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 150,
                    height: 150,
                    borderRadius: 99,
                    background: "rgba(202,0,19,.28)",
                    filter: "blur(28px)",
                  }}
                />
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      fontFamily: tok.font,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,.6)",
                    }}
                  >
                    {payload.question_card.label}
                  </div>
                  <div
                    style={{
                      fontFamily: tok.font,
                      fontSize: 19,
                      fontWeight: 900,
                      color: tok.white,
                      marginTop: 6,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {payload.question_card.text}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "11px 18px",
                        borderRadius: 99,
                        background: tok.red,
                        color: tok.white,
                        fontFamily: tok.font,
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      Yes, remind me →
                    </span>
                    <span
                      style={{
                        padding: "11px 18px",
                        borderRadius: 99,
                        border: "1px solid rgba(255,255,255,.25)",
                        color: tok.white,
                        fontFamily: tok.font,
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      Not yet
                    </span>
                  </div>
                </div>
              </div>

              {/* signoff */}
              <p
                style={{
                  fontFamily: tok.font,
                  fontSize: 14,
                  fontWeight: 500,
                  color: tok.ink2,
                  lineHeight: 1.6,
                  margin: "20px 0 0",
                }}
              >
                {payload.signoff.split("\n").map((ln, i) => (
                  <span key={i}>
                    {ln}
                    {i === 0 && <br />}
                  </span>
                ))}
              </p>

              {/* disclaimer */}
              <div
                style={{
                  marginTop: 22,
                  padding: "14px 16px",
                  borderRadius: 16,
                  background: tok.sageSoft,
                }}
              >
                <span style={{ fontFamily: tok.font, fontSize: 12, fontWeight: 500, color: tok.ink2, lineHeight: 1.5 }}>
                  {DISCLAIMER_FULL}
                </span>
              </div>

              {/* footer */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: `1px dashed ${tok.sage}80`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Wordmark size={14} />
                  <span style={{ fontFamily: tok.font, fontSize: 11, color: tok.mute }}>
                    · tracking, not diagnosis
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {["Reschedule", "Pause", "Unsubscribe"].map((l) => (
                    <span key={l} style={{ fontFamily: tok.font, fontSize: 11, color: tok.mute }}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* schedule strip */}
            <div
              style={{
                background: tok.paper,
                borderTop: `1px solid ${tok.sageSoft}`,
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icon name="cal" size={14} stroke={tok.ink2} strokeWidth={2} />
              <span style={{ fontFamily: tok.font, fontSize: 12, fontWeight: 700, color: tok.ink2 }}>
                Scheduled for{" "}
                <b style={{ color: tok.ink }}>
                  {forecast.nudgeDate ? formatDate(forecast.nudgeDate) : "—"}, 9:00 AM IST
                </b>
              </span>
            </div>
          </div>
        ) : (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <p style={{ fontFamily: tok.font, fontSize: 14, color: tok.ink2 }}>
              Couldn&apos;t render the nudge. Try again from the forecast.
            </p>
          </div>
        )}
      </div>

      {payload && (
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            padding: "0 16px 40px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <SendToInboxCard
            email={email}
            onEmailChange={setEmail}
            onSend={handleSend}
            disabled={sendDisabled}
            emailValid={emailValid}
            state={sendState}
            error={sendError}
            sentId={sentId}
            firstName={profile.firstName}
          />
          <Disclaimer compact style={{ justifyContent: "center" }} />
        </div>
      )}
    </main>
  );
}

interface SendCardProps {
  email: string;
  onEmailChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  emailValid: boolean;
  state: SendState;
  error: string | null;
  sentId: string | null;
  firstName: string;
}

function SendToInboxCard({
  email,
  onEmailChange,
  onSend,
  disabled,
  emailValid,
  state,
  error,
  sentId,
  firstName,
}: SendCardProps) {
  const status = (() => {
    if (state === "sending")
      return { tone: "info", text: `Sending to ${email}…` };
    if (state === "sent")
      return {
        tone: "ok",
        text: `Sent. Check your inbox (and Promotions, just in case).${
          sentId ? ` Resend id: ${sentId}` : ""
        }`,
      };
    if (state === "configRequired")
      return {
        tone: "warn",
        text:
          error ||
          "Add RESEND_API_KEY to .env.local (or Vercel env) to enable real sends.",
      };
    if (state === "error")
      return { tone: "warn", text: error || "Send failed — try again." };
    return null;
  })();

  return (
    <div
      style={{
        background: tok.white,
        borderRadius: 24,
        border: `1px solid ${tok.sageSoft}`,
        boxShadow: tok.shadowSm,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 99,
            background: tok.paper,
            border: `1px solid ${tok.sageSoft}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="bell" size={15} stroke={tok.ink} strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 15,
              fontWeight: 900,
              color: tok.ink,
              letterSpacing: "-0.01em",
            }}
          >
            Send this to my inbox
          </div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 12,
              fontWeight: 500,
              color: tok.mute,
              marginTop: 2,
            }}
          >
            Same template, real email — useful to feel the cadence.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1 1 220px",
            minWidth: 200,
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderRadius: 999,
            background: tok.paper,
            border: `1px solid ${
              email && !emailValid ? tok.red : tok.sageSoft
            }`,
          }}
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder={`${firstName.toLowerCase()}@example.com`}
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: tok.font,
              fontSize: 15,
              fontWeight: 700,
              color: tok.ink,
            }}
          />
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          style={{
            padding: "12px 22px",
            borderRadius: 999,
            border: "none",
            background: disabled ? tok.sageSoft : tok.red,
            color: disabled ? tok.mute : tok.white,
            fontFamily: tok.font,
            fontWeight: 800,
            fontSize: 14,
            cursor: disabled ? "default" : "pointer",
            boxShadow: disabled ? "none" : tok.shadowRed,
            transition: "background .15s, opacity .15s",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {state === "sending" ? (
            <span
              aria-hidden
              style={{
                width: 14,
                height: 14,
                borderRadius: 99,
                border: `2px solid rgba(255,255,255,.4)`,
                borderTopColor: tok.white,
                animation: "bl-spin 0.8s linear infinite",
              }}
            />
          ) : state === "sent" ? (
            <Icon name="check" size={14} stroke={tok.white} strokeWidth={2.4} />
          ) : null}
          {state === "sent" ? "Sent" : "Send to me →"}
        </button>
      </div>

      {status && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 14,
            background:
              status.tone === "ok"
                ? tok.sageMid
                : status.tone === "warn"
                  ? tok.amberSoft
                  : tok.paper,
            border: `1px solid ${
              status.tone === "warn" ? tok.amber : tok.sageSoft
            }`,
            fontFamily: tok.font,
            fontSize: 12,
            fontWeight: 600,
            color: status.tone === "warn" ? tok.amber : tok.ink2,
            lineHeight: 1.45,
          }}
        >
          {status.text}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px dashed ${tok.sage}80`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Icon name="info" size={12} stroke={tok.mute} strokeWidth={2} />
        <span
          style={{
            fontFamily: tok.font,
            fontSize: 11,
            fontWeight: 600,
            color: tok.mute,
            lineHeight: 1.4,
          }}
        >
          In production this fires automatically on the scheduled date. From the
          preview, you trigger it manually — useful for the demo.
        </span>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: tok.paper,
      }}
    >
      <Wordmark size={22} />
    </main>
  );
}
