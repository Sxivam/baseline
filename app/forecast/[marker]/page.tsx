"use client";

// Decay forecast — the magic moment. Data-driven chart for D and B12; other
// markers show the v1 message. "Why we think so" factors + the queued nudge.

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { MARKERS } from "@/lib/markers";
import { buildForecast } from "@/lib/forecast";
import { ERRORS } from "@/lib/copy";
import { formatDate, softDate } from "@/lib/format";
import { Blob, Button, Disclaimer, Icon, Wordmark } from "@/components/ui";
import { ForecastChart } from "@/components/ForecastChart";
import type { Profile } from "@/lib/types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Factor {
  icon: string;
  label: string;
  value: string;
  weight: number;
}

function factorsFor(markerId: string, profile: Profile): Factor[] {
  if (markerId === "vitamin_d") {
    return [
      { icon: "sun", label: "Season", value: "Sun hours dropping after August", weight: 3 },
      {
        icon: "home",
        label: "Your day",
        value:
          profile.sun === "indoor"
            ? "Indoors, mostly"
            : profile.sun === "mixed"
              ? "Indoor & outdoor mix"
              : "Outdoors often",
        weight: profile.sun === "indoor" ? 2 : 1,
      },
      { icon: "apple", label: "Diet", value: cap(profile.diet), weight: 1 },
    ];
  }
  return [
    {
      icon: "leaf",
      label: "Diet",
      value: cap(profile.diet),
      weight: profile.diet === "vegan" || profile.diet === "veg" ? 3 : profile.diet === "mixed" ? 2 : 1,
    },
    { icon: "spark", label: "Stores", value: "B12 draws down month over month", weight: 2 },
  ];
}

function FactorRow({ f }: { f: Factor }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 18,
        background: tok.white,
        border: `1px solid ${tok.sageSoft}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: tok.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon name={f.icon} size={18} stroke={tok.ink2} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="hi-label">{f.label}</div>
        <div style={{ fontFamily: tok.font, fontSize: 14, fontWeight: 800, color: tok.ink, marginTop: 2 }}>
          {f.value}
        </div>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 16,
              borderRadius: 3,
              background: i <= f.weight ? tok.red : tok.sageSoft,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ForecastPage() {
  const router = useRouter();
  const params = useParams<{ marker: string }>();
  const markerId = params.marker;
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const parse = useBaseline((s) => s.parse);

  useEffect(() => {
    if (hydrated && !profile) router.replace("/start");
    else if (hydrated && profile && !parse) router.replace("/upload");
  }, [hydrated, profile, parse, router]);

  if (!hydrated || !profile || !parse) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: tok.paper }}>
        <Wordmark size={22} />
      </main>
    );
  }

  const def = MARKERS[markerId];
  const reading = parse.markers.find((m) => m.markerId === markerId);

  const TopBar = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
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
      <span className="hi-label">{def?.name || "Marker"} · Forecast</span>
      <Wordmark size={16} />
    </div>
  );

  // Not a v1 forecast marker → graceful message.
  if (!def || !def.inV1Forecast || !def.thresholds || !reading) {
    return (
      <main style={{ minHeight: "100vh", background: tok.paper, position: "relative", overflow: "hidden" }}>
        <Blob size={320} top={-150} right={-100} color={tok.sageMid} blur={20} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "24px 22px 48px" }}>
          {TopBar}
          <div className="hi-card" style={{ padding: 30, marginTop: 28, textAlign: "center" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 99,
                background: tok.sageSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <Icon name="spark" size={22} stroke={tok.ink2} strokeWidth={1.8} />
            </div>
            <h1 style={{ fontFamily: tok.font, fontSize: 22, fontWeight: 900, margin: 0 }}>
              Where this is heading.
            </h1>
            <p style={{ fontFamily: tok.font, fontSize: 14, fontWeight: 500, color: tok.ink2, margin: "10px 0 0", lineHeight: 1.5 }}>
              {ERRORS.forecastUnavailable}
            </p>
            <Button onClick={() => router.push("/dashboard")} variant="secondary" style={{ marginTop: 20 }}>
              Back to baseline
            </Button>
          </div>
          <Disclaimer style={{ marginTop: 18 }} />
        </div>
      </main>
    );
  }

  const testDate = parse.testDate || new Date().toISOString().slice(0, 10);
  const forecast = buildForecast(markerId, reading.value, new Date(testDate), profile);
  const threshold = def.thresholds.low;
  const factors = factorsFor(markerId, profile);

  const verdict = forecast.alreadyBelow
    ? `${def.name} is already under the ${threshold} ${def.unit} line — here's how fast it slides if nothing changes.`
    : forecast.crossingDate
      ? `Based on your last reading, the season, and how ${def.name} typically behaves — left alone, it likely crosses ${threshold} around ${softDate(forecast.crossingDate)}.`
      : `${def.name} looks like it holds above the ${threshold} ${def.unit} line through the next six months.`;

  const nudgeQuote = forecast.alreadyBelow
    ? `"Your ${def.name} has slipped under the line — worth a dietary look and a re-test."`
    : forecast.crossingDate
      ? `"Your ${def.name} is quietly drifting. Get ahead of it — then re-test."`
      : `"Quick ${def.name} check-in — still looking steady?"`;

  return (
    <main style={{ minHeight: "100vh", background: tok.paper, position: "relative", overflow: "hidden" }}>
      <Blob size={420} top={-180} right={-110} color={tok.sageMid} blur={20} />
      <Blob size={240} bottom={-110} left={-80} color={tok.redSoft} blur={20} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "24px 22px 56px" }}>
        {TopBar}

        <div style={{ marginTop: 24 }}>
          <h1
            style={{
              fontFamily: tok.font,
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            Where this is <span style={{ color: tok.red }}>heading.</span>
          </h1>
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 15,
              fontWeight: 500,
              color: tok.ink2,
              margin: "10px 0 0",
              maxWidth: 580,
              lineHeight: 1.55,
            }}
          >
            {verdict}
          </p>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr]"
          style={{ gap: 16, marginTop: 18, alignItems: "start" }}
        >
          {/* chart */}
          <div className="hi-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <Blob size={140} top={-30} right={-30} color={tok.sageMid} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span className="hi-label">Projected · next 6 months</span>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 16, height: 2.5, background: tok.ink, borderRadius: 2 }} />
                      <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: tok.ink2 }}>Observed</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 16, height: 2.5, background: tok.red, borderRadius: 2 }} />
                      <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: tok.ink2 }}>Projected</span>
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: tok.font,
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      color: tok.mute,
                      border: `1px solid ${tok.sageSoft}`,
                      padding: "3px 7px",
                      borderRadius: 6,
                    }}
                  >
                    ESTIMATE
                  </span>
                </div>
              </div>
              <ForecastChart forecast={forecast} threshold={threshold} unit={def.unit} />
            </div>
          </div>

          {/* factors + nudge */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span className="hi-label">Why we think so</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {factors.map((f) => (
                  <FactorRow key={f.label} f={f} />
                ))}
              </div>
            </div>

            <div
              style={{
                background: tok.ink,
                borderRadius: 24,
                padding: 22,
                color: tok.white,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Blob size={170} bottom={-80} right={-60} color="rgba(202,0,19,.28)" blur={20} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      background: tok.red,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="bell" size={14} stroke={tok.white} strokeWidth={2} />
                  </div>
                  <span
                    style={{
                      fontFamily: tok.font,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,.6)",
                    }}
                  >
                    NEXT NUDGE
                  </span>
                </div>
                <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: tok.font, fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em" }}>
                    {forecast.nudgeDate ? formatDate(forecast.nudgeDate) : "Scheduled"}
                  </div>
                  <span style={{ fontFamily: tok.font, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>
                    {forecast.alreadyBelow
                      ? "now — you're already under"
                      : forecast.neverCrosses
                        ? "a routine check-in"
                        : "~3 wk before crossing"}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: tok.font,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "rgba(255,255,255,.75)",
                    margin: "8px 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {nudgeQuote}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Button
                    onClick={() => router.push(`/nudges/${markerId}/preview`)}
                    style={{ flex: 1, padding: "12px 14px", fontSize: 13 }}
                  >
                    Preview email
                    <Icon name="arrow" size={14} stroke={tok.white} strokeWidth={2.4} />
                  </Button>
                  <button
                    type="button"
                    style={{
                      flex: "0 0 auto",
                      padding: "12px 16px",
                      borderRadius: 99,
                      border: "1px solid rgba(255,255,255,.2)",
                      background: "transparent",
                      color: tok.white,
                      fontFamily: tok.font,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/tests?markers=${markerId}`)}
              className="hi-card"
              style={{
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                border: `1px solid ${tok.sageSoft}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: tok.sageMid,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 auto",
                }}
              >
                <Icon name="file" size={16} stroke={tok.ink} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="hi-label">When you re-test</span>
                <div
                  style={{
                    fontFamily: tok.font,
                    fontSize: 14,
                    fontWeight: 800,
                    color: tok.ink,
                    marginTop: 2,
                  }}
                >
                  Find a panel covering {def.name} →
                </div>
              </div>
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <Disclaimer />
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 11,
              fontWeight: 500,
              color: tok.mute,
              margin: "10px 2px 0",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            How this works: a transparent heuristic projects your last reading using
            typical monthly decay, your diet and sun answers, and the season. It&apos;s an
            estimate to time a nudge — not a measurement.
          </p>
        </div>
      </div>
    </main>
  );
}
