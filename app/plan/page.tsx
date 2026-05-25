"use client";

// /plan — the payoff. After intake, this page reveals:
//   1. A severity-aware headline + summary tied to the user's data
//   2. A 4-week curated plan (themes + moves)
//   3. The two accountability tracks — weekly check-ins + re-test alerts
//   4. The "I'm in" commit moment — captures email, marks plan accepted
// LLM-curated via /api/generate-plan with the static plan as the instant
// baseline so the reveal is never blank.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { buildPlanInput, staticPlan, type PlanInput } from "@/lib/plan";
import { MARKERS } from "@/lib/markers";
import { Disclaimer, Icon, Monogram, Wordmark } from "@/components/ui";
import type { Plan, PlanSeverity, PlanWeek, PlanWeekMove } from "@/lib/types";

const SEVERITY_META: Record<
  PlanSeverity,
  { label: string; accent: string; bg: string }
> = {
  gentle: { label: "Maintenance mode", accent: tok.ink, bg: tok.sageMid },
  moderate: { label: "Lean in", accent: tok.amber, bg: tok.amberSoft },
  urgent: { label: "Worth showing up for", accent: tok.red, bg: "rgba(202,0,19,.08)" },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PlanPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const parse = useBaseline((s) => s.parse);
  const intake = useBaseline((s) => s.intake);
  const storedPlan = useBaseline((s) => s.plan);
  const setPlan = useBaseline((s) => s.setPlan);
  const accountabilityEmail = useBaseline((s) => s.accountabilityEmail);
  const setAccountabilityEmail = useBaseline((s) => s.setAccountabilityEmail);
  const acceptPlan = useBaseline((s) => s.acceptPlan);

  const [plan, setPlanLocal] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string | null>(null);
  const [email, setEmailLocal] = useState("");
  const [committing, setCommitting] = useState(false);
  const started = useRef(false);

  const planInput = useMemo<PlanInput | null>(() => {
    if (!profile || !parse || !intake) return null;
    return buildPlanInput(profile, parse.markers, intake);
  }, [profile, parse, intake]);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile) {
      router.replace("/start");
      return;
    }
    if (!parse) {
      router.replace("/upload");
      return;
    }
    if (!intake) {
      router.replace("/intake");
      return;
    }
    if (accountabilityEmail) setEmailLocal(accountabilityEmail);

    if (started.current || !planInput) return;
    started.current = true;

    // Instant baseline.
    const baseline = staticPlan(planInput);
    setPlanLocal(baseline);
    setPlan(baseline);
    setLoading(false);

    // Upgrade with LLM in the background.
    fetch("/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(planInput),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.weeks) && data.weeks.length > 0) {
          const merged: Plan = {
            summary: data.summary || baseline.summary,
            severity: (data.severity ?? baseline.severity) as PlanSeverity,
            headline: data.headline || baseline.headline,
            weeks: data.weeks,
            nudgeTracks: data.nudgeTracks || baseline.nudgeTracks,
            startedAt: storedPlan?.startedAt ?? null,
            safety_check: data.safety_check ?? "pass",
          };
          setPlanLocal(merged);
          setPlan(merged);
          setSource(data.source ?? null);
        }
      })
      .catch(() => {});
  }, [
    hydrated,
    profile,
    parse,
    intake,
    planInput,
    storedPlan,
    setPlan,
    accountabilityEmail,
    router,
  ]);

  if (!hydrated || !profile || !parse || !intake) {
    return <Splash />;
  }

  const emailValid = EMAIL_RE.test(email.trim());
  const meta = plan ? SEVERITY_META[plan.severity] : SEVERITY_META.moderate;

  function commit() {
    if (!emailValid || !plan) return;
    setCommitting(true);
    setAccountabilityEmail(email.trim());
    acceptPlan();
    setTimeout(() => router.push("/dashboard"), 500);
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
          onClick={() => router.push("/intake")}
          aria-label="Back to intake"
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
          <div className="hi-label">Your plan</div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 14,
              fontWeight: 800,
              color: tok.ink,
            }}
          >
            4 weeks
          </div>
        </div>
        <Wordmark size={15} />
      </header>

      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "26px 16px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {loading || !plan ? (
          <LoadingState />
        ) : (
          <>
            {/* Hero reveal */}
            <section
              style={{
                background: tok.ink,
                color: tok.white,
                borderRadius: 28,
                padding: 28,
                position: "relative",
                overflow: "hidden",
                animation: "bl-fade-up 0.45s ease-out",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 220,
                  height: 220,
                  borderRadius: 99,
                  background: meta.bg,
                  filter: "blur(40px)",
                }}
              />
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 99,
                    background: "rgba(255,255,255,.1)",
                    border: "1px solid rgba(255,255,255,.18)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      background: meta.accent,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: tok.font,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,.85)",
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
                <h1
                  style={{
                    fontFamily: tok.font,
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                    color: tok.white,
                    margin: "16px 0 0",
                    lineHeight: 1.12,
                  }}
                >
                  {plan.headline}
                </h1>
                <p
                  style={{
                    fontFamily: tok.font,
                    fontSize: 15,
                    fontWeight: 500,
                    color: "rgba(255,255,255,.78)",
                    margin: "12px 0 0",
                    lineHeight: 1.6,
                  }}
                >
                  {plan.summary}
                </p>
              </div>
            </section>

            {/* Weeks */}
            <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span className="hi-label">Your four weeks</span>
                <span
                  style={{
                    fontFamily: tok.font,
                    fontSize: 11,
                    fontWeight: 800,
                    color: tok.mute,
                    letterSpacing: "0.04em",
                  }}
                >
                  ONE THING AT A TIME
                </span>
              </div>
              {plan.weeks.map((w, i) => (
                <WeekCard key={w.week} week={w} index={i + 1} total={plan.weeks.length} />
              ))}
            </section>

            {/* Accountability + tracks */}
            <section
              style={{
                background: tok.white,
                border: `1px solid ${tok.sageSoft}`,
                borderRadius: 28,
                padding: 24,
                boxShadow: tok.shadowSm,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Monogram size={34} radius={11} />
                <div>
                  <div className="hi-label">Baseline holds you to it</div>
                  <div
                    style={{
                      fontFamily: tok.font,
                      fontSize: 18,
                      fontWeight: 900,
                      color: tok.ink,
                      letterSpacing: "-0.01em",
                      marginTop: 2,
                    }}
                  >
                    Two nudge tracks, both quiet.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                }}
              >
                <TrackCard
                  title="Weekly check-in"
                  subtitle={`Every ${plan.nudgeTracks.weeklyCheckin.day}`}
                  bullets={
                    plan.nudgeTracks.weeklyCheckin.topics.length
                      ? plan.nudgeTracks.weeklyCheckin.topics.map((t) => `· ${t}`)
                      : ["· How the week felt", "· What stuck, what didn't", "· One adjustment for next week"]
                  }
                  emoji="🪴"
                />
                <TrackCard
                  title="Re-test alerts"
                  subtitle={
                    plan.nudgeTracks.retests.length
                      ? `${plan.nudgeTracks.retests.length} marker${plan.nudgeTracks.retests.length > 1 ? "s" : ""} on the radar`
                      : "Quarterly check-ins"
                  }
                  bullets={
                    plan.nudgeTracks.retests.length
                      ? plan.nudgeTracks.retests.map(
                          (r) => `· ${r.markerName} — ${r.whenSoft}`,
                        )
                      : ["· We'll suggest a routine quarterly re-test"]
                  }
                  emoji="🧪"
                />
              </div>
            </section>

            {/* Commit */}
            <section
              style={{
                background: tok.ink,
                color: tok.white,
                borderRadius: 28,
                padding: 26,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: -40,
                  right: -40,
                  width: 180,
                  height: 180,
                  borderRadius: 99,
                  background: "rgba(202,0,19,.32)",
                  filter: "blur(32px)",
                }}
              />
              <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    fontFamily: tok.font,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,.6)",
                    textTransform: "uppercase",
                  }}
                >
                  Make it real
                </div>
                <h2
                  style={{
                    fontFamily: tok.font,
                    fontSize: 24,
                    fontWeight: 900,
                    letterSpacing: "-0.01em",
                    color: tok.white,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Where should the check-ins land?
                </h2>
                <p
                  style={{
                    fontFamily: tok.font,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "rgba(255,255,255,.78)",
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  We&apos;ll email you every {plan.nudgeTracks.weeklyCheckin.day.toLowerCase()} morning
                  with this week&apos;s focus, and once before each marker is likely to drift. No
                  marketing, no upsells. You can pause anytime.
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.08)",
                    border: `1px solid ${
                      email && !emailValid
                        ? tok.red
                        : "rgba(255,255,255,.18)"
                    }`,
                  }}
                >
                  <Icon name="bell" size={14} stroke={tok.white} strokeWidth={2} />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmailLocal(e.target.value)}
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
                      color: tok.white,
                    }}
                  />
                </div>

                <button
                  type="button"
                  disabled={!emailValid || committing}
                  onClick={commit}
                  style={{
                    padding: "14px 24px",
                    borderRadius: 999,
                    border: "none",
                    background: emailValid ? tok.red : "rgba(255,255,255,.08)",
                    color: emailValid ? tok.white : "rgba(255,255,255,.4)",
                    fontFamily: tok.font,
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: emailValid && !committing ? "pointer" : "default",
                    boxShadow: emailValid ? tok.shadowRed : "none",
                    transition: "background .2s",
                  }}
                >
                  {committing ? "Locking it in…" : "I'm in — start the plan →"}
                </button>

                <p
                  style={{
                    fontFamily: tok.font,
                    fontSize: 11,
                    fontWeight: 500,
                    color: "rgba(255,255,255,.5)",
                    margin: 0,
                    lineHeight: 1.45,
                  }}
                >
                  Baseline is an awareness tool — not a doctor, not a prescription. We track,
                  we nudge, we re-test. You stay in the driver&apos;s seat.
                </p>
              </div>
            </section>

            {source === "llm" && (
              <div
                style={{
                  fontFamily: tok.font,
                  fontSize: 11,
                  fontWeight: 600,
                  color: tok.mute,
                  textAlign: "center",
                }}
              >
                Plan curated by an LLM via OpenRouter — §7-gated, behavioural only.
              </div>
            )}

            <Disclaimer />
          </>
        )}
      </div>
    </main>
  );
}

// ─── sub-components ─────────────────────────────────────────────────────────

function WeekCard({
  week,
  index,
  total,
}: {
  week: PlanWeek;
  index: number;
  total: number;
}) {
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
        animation: `bl-fade-up 0.4s ease-out ${index * 0.05}s backwards`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            background: tok.ink,
            color: tok.white,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,.6)",
            }}
          >
            WEEK
          </div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 1,
              marginTop: 1,
            }}
          >
            {week.week}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: tok.mute,
              textTransform: "uppercase",
            }}
          >
            Focus {index}/{total}
          </div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 17,
              fontWeight: 900,
              color: tok.ink,
              letterSpacing: "-0.01em",
              marginTop: 2,
              lineHeight: 1.25,
            }}
          >
            {week.focus}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {week.moves.map((m, i) => (
          <MoveRow key={`${week.week}-${i}`} move={m} />
        ))}
      </div>
    </article>
  );
}

function MoveRow({ move }: { move: PlanWeekMove }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 16,
        background: tok.paper,
        border: `1px solid ${tok.sageSoft}`,
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: tok.white,
          border: `1px solid ${tok.sageSoft}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flex: "0 0 auto",
        }}
      >
        {move.emoji}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: tok.font,
            fontSize: 14,
            fontWeight: 900,
            color: tok.ink,
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
          }}
        >
          {move.title}
        </div>
        {move.why && (
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 12,
              fontWeight: 500,
              color: tok.ink2,
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            {move.why}
          </div>
        )}
        <div
          style={{
            fontFamily: tok.font,
            fontSize: 12,
            fontWeight: 700,
            color: tok.ink,
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: tok.red, fontWeight: 800 }}>Do this:</span>{" "}
          {move.action}
        </div>
        {move.markersHelped.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {move.markersHelped.map((id) => {
              const def = MARKERS[id];
              if (!def) return null;
              return (
                <span
                  key={id}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 99,
                    background: tok.sageMid,
                    fontFamily: tok.font,
                    fontSize: 10,
                    fontWeight: 700,
                    color: tok.ink,
                  }}
                >
                  {def.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TrackCard({
  title,
  subtitle,
  bullets,
  emoji,
}: {
  title: string;
  subtitle: string;
  bullets: string[];
  emoji: string;
}) {
  return (
    <div
      style={{
        background: tok.paper,
        border: `1px solid ${tok.sageSoft}`,
        borderRadius: 20,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: tok.white,
            border: `1px solid ${tok.sageSoft}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          {emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hi-label">{title}</div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 14,
              fontWeight: 800,
              color: tok.ink,
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {bullets.map((b, i) => (
          <li
            key={i}
            style={{
              fontFamily: tok.font,
              fontSize: 12,
              fontWeight: 600,
              color: tok.ink2,
              lineHeight: 1.5,
            }}
          >
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <div
        style={{
          background: tok.ink,
          borderRadius: 28,
          padding: 28,
          color: tok.white,
          position: "relative",
          overflow: "hidden",
          minHeight: 160,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.04) 50%, transparent 100%)",
            animation: "bl-shimmer 1.4s linear infinite",
          }}
        />
        <span
          style={{
            position: "relative",
            fontFamily: tok.font,
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,.6)",
          }}
        >
          Composing your four weeks…
        </span>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: tok.white,
            border: `1px solid ${tok.sageSoft}`,
            borderRadius: 24,
            padding: 22,
            height: 160,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg, transparent 0%, ${tok.sageSoft} 50%, transparent 100%)`,
              animation: "bl-shimmer 1.4s linear infinite",
            }}
          />
        </div>
      ))}
    </>
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
