"use client";

// /nudges — cadence overview. One row per forecastable marker with a reading,
// showing when its email fires, why, and a one-click "send to my inbox" so a
// reviewer can feel the loop end-to-end without waiting weeks.
//
// In production: a daily cron (Vercel Cron or GitHub Action) reads every
// user's forecast, finds the rows where `nudgeDate` is today, and POSTs to
// /api/send-nudge with the cached LLM payload (or static fallback if missing).
// The cadence rule: 3 weeks before the projected crossing (`nudgeFromCrossing`
// in lib/forecast.ts), or 4 months out for periodic check-ins when the marker
// isn't projected to cross. This page just exposes the queue.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { MARKERS, MARKER_ORDER } from "@/lib/markers";
import { buildForecast } from "@/lib/forecast";
import { buildNudgeInput, staticNudge } from "@/lib/nudge";
import { formatDate } from "@/lib/format";
import {
  Disclaimer,
  Icon,
  Monogram,
  StatusChip,
  Wordmark,
} from "@/components/ui";
import { computeStatus } from "@/lib/status";
import type { Forecast, NudgePayload } from "@/lib/types";
import type { NudgeProjection } from "@/lib/email-template";

type SendState = "idle" | "sending" | "sent" | "configRequired" | "error";
interface SendResult {
  state: SendState;
  error?: string | null;
  id?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Row {
  markerId: string;
  name: string;
  fullName: string;
  unit: string;
  lastValue: number;
  testDate: string;
  forecast: Forecast;
  payload: NudgePayload;
  projection: NudgeProjection;
  status: "in" | "watch" | "low";
  schedule: {
    label: string;
    sub: string;
    tone: "soon" | "queued" | "drift";
    iso: string | null;
  };
}

export default function NudgesIndexPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const parse = useBaseline((s) => s.parse);
  const cachedNudges = useBaseline((s) => s.nudges);

  const [email, setEmail] = useState("");
  const [sendState, setSendState] = useState<Record<string, SendResult>>({});

  // refs to bypass dependency on rows in the send handler
  const rowsRef = useRef<Row[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile) router.replace("/start");
    else if (!parse) router.replace("/upload");
  }, [hydrated, profile, parse, router]);

  const rows = useMemo<Row[]>(() => {
    if (!profile || !parse) return [];
    const testDate = parse.testDate || new Date().toISOString().slice(0, 10);

    return MARKER_ORDER.flatMap((markerId) => {
      const def = MARKERS[markerId];
      if (!def?.inV1Forecast) return [];
      const reading = parse.markers.find((m) => m.markerId === markerId);
      if (!reading) return [];

      const forecast = buildForecast(
        markerId,
        reading.value,
        new Date(testDate),
        profile,
      );
      const input = buildNudgeInput(
        markerId,
        reading.value,
        testDate,
        forecast,
        profile,
      );
      const m = input.marker;
      const delta =
        Math.round((m.current_estimate - m.last_value) * 10) / 10;
      const payload = cachedNudges[markerId] ?? staticNudge(input);

      const projection: NudgeProjection = {
        markerFullName: def.fullName,
        unit: def.unit,
        threshold: m.threshold,
        lastDate: formatDate(testDate),
        lastValue: m.last_value,
        todayLabel: "Today",
        todayValue: m.current_estimate,
        todayDelta:
          delta === 0
            ? ""
            : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} since`,
        projectedLabel:
          m.projected_date.charAt(0).toUpperCase() +
          m.projected_date.slice(1),
        projectedValue: m.projected_value,
        projectedDelta: forecast.crossingDate
          ? "crosses the line"
          : "in the window",
      };

      let schedule: Row["schedule"];
      if (forecast.alreadyBelow) {
        const iso = forecast.nudgeDate;
        schedule = {
          label: iso ? formatDate(iso) : "Tomorrow",
          sub: "Already under the line — first nudge fires next morning.",
          tone: "soon",
          iso,
        };
      } else if (forecast.crossingDate && forecast.nudgeDate) {
        schedule = {
          label: formatDate(forecast.nudgeDate),
          sub: `~3 weeks before the projected crossing on ${formatDate(
            forecast.crossingDate,
          )}.`,
          tone: "queued",
          iso: forecast.nudgeDate,
        };
      } else {
        schedule = {
          label: forecast.nudgeDate
            ? formatDate(forecast.nudgeDate)
            : "Periodic",
          sub: "Periodic check-in — value isn't projected to cross within 6 months.",
          tone: "drift",
          iso: forecast.nudgeDate,
        };
      }

      const status = computeStatus(markerId, reading.value, profile.sex);

      return [
        {
          markerId,
          name: def.name,
          fullName: def.fullName,
          unit: def.unit,
          lastValue: reading.value,
          testDate,
          forecast,
          payload,
          projection,
          status,
          schedule,
        },
      ];
    });
  }, [profile, parse, cachedNudges]);

  rowsRef.current = rows;

  const emailValid = EMAIL_RE.test(email.trim());

  async function sendOne(markerId: string) {
    const row = rowsRef.current.find((r) => r.markerId === markerId);
    if (!row || !profile || !emailValid) return;
    setSendState((s) => ({
      ...s,
      [markerId]: { state: "sending", error: null, id: null },
    }));
    try {
      const res = await fetch("/api/send-nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          payload: row.payload,
          projection: row.projection,
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
        setSendState((s) => ({
          ...s,
          [markerId]: { state: "sent", id: data.id ?? null },
        }));
      } else if (res.status === 503 && data.configRequired) {
        setSendState((s) => ({
          ...s,
          [markerId]: {
            state: "configRequired",
            error: data.error ?? null,
          },
        }));
      } else {
        setSendState((s) => ({
          ...s,
          [markerId]: {
            state: "error",
            error: data.error ?? `Send failed (status ${res.status}).`,
          },
        }));
      }
    } catch (err) {
      setSendState((s) => ({
        ...s,
        [markerId]: {
          state: "error",
          error: err instanceof Error ? err.message : "Network error",
        },
      }));
    }
  }

  if (!hydrated || !profile || !parse) {
    return <Splash />;
  }

  return (
    <main style={{ minHeight: "100vh", background: tok.paper }}>
      {/* header */}
      <header
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
          onClick={() => router.push("/dashboard")}
          aria-label="Back to dashboard"
          style={{
            width: 38,
            height: 38,
            borderRadius: 99,
            border: `1px solid ${tok.sageSoft}`,
            background: tok.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <Icon name="arrow" size={15} stroke={tok.ink} strokeWidth={2.2} />
          </span>
        </button>
        <div style={{ textAlign: "center" }}>
          <div className="hi-label">Nudge cadence</div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 14,
              fontWeight: 800,
              color: tok.ink,
            }}
          >
            {rows.length} in the queue
          </div>
        </div>
        <Wordmark size={15} />
      </header>

      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "26px 16px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* intro */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "4px 4px 0",
          }}
        >
          <h1
            style={{
              fontFamily: tok.font,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: tok.ink,
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Your nudge schedule
          </h1>
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 14,
              fontWeight: 500,
              color: tok.ink2,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            One email per drifting marker, queued ~3 weeks before the line.
            In production a daily cron picks up everything due that morning and
            dispatches via <code style={codeChip}>POST /api/send-nudge</code>.
            From here you can preview each one — or send it to your real inbox
            now to feel the loop.
          </p>
        </section>

        {/* email control */}
        <section
          style={{
            background: tok.white,
            border: `1px solid ${tok.sageSoft}`,
            borderRadius: 24,
            padding: 18,
            boxShadow: tok.shadowSm,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Monogram size={32} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: tok.font,
                  fontSize: 14,
                  fontWeight: 900,
                  color: tok.ink,
                  letterSpacing: "-0.01em",
                }}
              >
                Demo inbox
              </div>
              <div
                style={{
                  fontFamily: tok.font,
                  fontSize: 12,
                  color: tok.mute,
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                Set once — used by every &ldquo;Send to me&rdquo; button below.
              </div>
            </div>
          </div>
          <div
            style={{
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
            <Icon name="bell" size={14} stroke={tok.ink2} strokeWidth={2} />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`${profile.firstName.toLowerCase()}@example.com`}
              style={{
                flex: 1,
                minWidth: 0,
                marginLeft: 10,
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
        </section>

        {/* rows */}
        {rows.length === 0 ? (
          <EmptyState onUpload={() => router.push("/upload")} />
        ) : (
          rows.map((r) => (
            <NudgeRow
              key={r.markerId}
              row={r}
              send={sendState[r.markerId]}
              canSend={emailValid}
              onSend={() => sendOne(r.markerId)}
              onPreview={() => router.push(`/nudges/${r.markerId}/preview`)}
            />
          ))
        )}

        {/* cron explainer */}
        <section
          style={{
            background: tok.ink,
            color: tok.white,
            borderRadius: 24,
            padding: 22,
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
              HOW IT FIRES IN PRODUCTION
            </div>
            <div
              style={{
                fontFamily: tok.font,
                fontSize: 19,
                fontWeight: 900,
                letterSpacing: "-0.01em",
                marginTop: 6,
                lineHeight: 1.25,
              }}
            >
              Daily cron · 9:00 AM IST · one POST per due row
            </div>
            <ol
              style={{
                marginTop: 14,
                paddingLeft: 20,
                fontFamily: tok.font,
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.55,
                color: "rgba(255,255,255,.82)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <li>
                Vercel Cron (or a GitHub Action) hits an internal route every
                morning.
              </li>
              <li>
                Route queries the day&rsquo;s due nudges (rows where{" "}
                <code style={codeChipDark}>nudgeDate</code> is today), fetches
                the cached LLM copy (or falls back to{" "}
                <code style={codeChipDark}>staticNudge</code>).
              </li>
              <li>
                POSTs each to{" "}
                <code style={codeChipDark}>/api/send-nudge</code>. Resend
                returns an id; we log it.
              </li>
              <li>
                User clicks &ldquo;Yes, remind me&rdquo; → we re-schedule. They
                click &ldquo;Not yet&rdquo; → we push by 2 weeks.
              </li>
            </ol>
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px dashed rgba(255,255,255,.2)",
                fontFamily: tok.font,
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,.55)",
                lineHeight: 1.5,
              }}
            >
              Demo build runs the manual button above instead of the cron —
              same endpoint, same template. Add{" "}
              <code style={codeChipDark}>RESEND_API_KEY</code> to .env.local
              (or Vercel project env) to switch real sends on.
            </div>
          </div>
        </section>

        <Disclaimer compact style={{ justifyContent: "center" }} />
      </div>
    </main>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  row: Row;
  send: SendResult | undefined;
  canSend: boolean;
  onSend: () => void;
  onPreview: () => void;
}

function NudgeRow({ row, send, canSend, onSend, onPreview }: RowProps) {
  const state = send?.state ?? "idle";
  const status = (() => {
    if (state === "sending") return { tone: "info", text: "Sending…" };
    if (state === "sent")
      return {
        tone: "ok",
        text: `Sent. Check your inbox.${send?.id ? ` (id ${send.id})` : ""}`,
      };
    if (state === "configRequired")
      return {
        tone: "warn",
        text:
          send?.error ||
          "Add RESEND_API_KEY to enable real sends. Preview still works.",
      };
    if (state === "error")
      return { tone: "warn", text: send?.error || "Send failed." };
    return null;
  })();

  const accentForTone =
    row.schedule.tone === "soon"
      ? tok.red
      : row.schedule.tone === "queued"
        ? tok.ink
        : tok.amber;

  const disabled = !canSend || state === "sending";

  return (
    <article
      style={{
        background: tok.white,
        border: `1px solid ${tok.sageSoft}`,
        borderRadius: 24,
        padding: 22,
        boxShadow: tok.shadowSm,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 18,
              fontWeight: 900,
              color: tok.ink,
              letterSpacing: "-0.01em",
            }}
          >
            {row.fullName}
          </div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 12,
              color: tok.mute,
              fontWeight: 700,
            }}
          >
            Last reading {row.lastValue} {row.unit} · {formatDate(row.testDate)}
          </div>
        </div>
        <StatusChip kind={row.status} />
      </div>

      {/* schedule strip */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "12px 14px",
          borderRadius: 16,
          background: tok.paper,
          border: `1px solid ${tok.sageSoft}`,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: accentForTone,
            flex: "0 0 auto",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 13,
              fontWeight: 800,
              color: tok.ink,
            }}
          >
            Scheduled for {row.schedule.label}
          </div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 11,
              fontWeight: 600,
              color: tok.mute,
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {row.schedule.sub}
          </div>
        </div>
        <div
          style={{
            fontFamily: tok.font,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: accentForTone,
            textTransform: "uppercase",
            textAlign: "right",
          }}
        >
          {row.schedule.tone === "soon"
            ? "Soon"
            : row.schedule.tone === "queued"
              ? "Queued"
              : "Drift"}
        </div>
      </div>

      {/* subject line preview */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          background: tok.paper,
          border: `1px dashed ${tok.sage}80`,
          fontFamily: tok.font,
          fontSize: 12,
          fontWeight: 700,
          color: tok.ink2,
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: tok.mute }}>Subject:&nbsp;</span>
        {row.payload.subject}
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          style={{
            padding: "11px 18px",
            borderRadius: 999,
            border: "none",
            background: disabled ? tok.sageSoft : tok.red,
            color: disabled ? tok.mute : tok.white,
            fontFamily: tok.font,
            fontWeight: 800,
            fontSize: 13,
            cursor: disabled ? "default" : "pointer",
            boxShadow: disabled ? "none" : tok.shadowRed,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "background .15s",
          }}
        >
          {state === "sending" && (
            <span
              aria-hidden
              style={{
                width: 12,
                height: 12,
                borderRadius: 99,
                border: "2px solid rgba(255,255,255,.4)",
                borderTopColor: tok.white,
                animation: "bl-spin 0.8s linear infinite",
              }}
            />
          )}
          {state === "sent" && (
            <Icon name="check" size={13} stroke={tok.white} strokeWidth={2.4} />
          )}
          {state === "sent" ? "Sent" : "Send to me"}
        </button>
        <button
          type="button"
          onClick={onPreview}
          style={{
            padding: "11px 18px",
            borderRadius: 999,
            border: `1px solid ${tok.sage}`,
            background: tok.white,
            color: tok.ink,
            fontFamily: tok.font,
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Preview email →
        </button>
      </div>

      {status && (
        <div
          style={{
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
    </article>
  );
}

// ─── States ─────────────────────────────────────────────────────────────────

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div
      style={{
        background: tok.white,
        border: `1px solid ${tok.sageSoft}`,
        borderRadius: 24,
        padding: 28,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
      }}
    >
      <Icon name="bell" size={28} stroke={tok.mute} strokeWidth={1.8} />
      <h2
        style={{
          fontFamily: tok.font,
          fontSize: 18,
          fontWeight: 900,
          color: tok.ink,
          margin: 0,
        }}
      >
        Nothing scheduled yet
      </h2>
      <p
        style={{
          fontFamily: tok.font,
          fontSize: 13,
          color: tok.ink2,
          fontWeight: 500,
          lineHeight: 1.55,
          margin: 0,
          maxWidth: 380,
        }}
      >
        Once you upload a report with a Vitamin D or B12 reading, we project
        the curve and queue a nudge ~3 weeks before it crosses the line.
      </p>
      <button
        type="button"
        onClick={onUpload}
        style={{
          marginTop: 4,
          padding: "11px 22px",
          borderRadius: 999,
          background: tok.red,
          color: tok.white,
          border: "none",
          fontFamily: tok.font,
          fontWeight: 800,
          fontSize: 13,
          cursor: "pointer",
          boxShadow: tok.shadowRed,
        }}
      >
        Upload a report →
      </button>
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

const codeChip: React.CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace",
  fontSize: 12,
  background: tok.sageSoft,
  padding: "2px 6px",
  borderRadius: 6,
  color: tok.ink,
};

const codeChipDark: React.CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace",
  fontSize: 11,
  background: "rgba(255,255,255,.12)",
  padding: "1px 6px",
  borderRadius: 6,
  color: tok.white,
};
