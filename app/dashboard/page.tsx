"use client";

// Dashboard — per-marker baseline. Scroll selector → hero card; forecastable
// markers (D, B12) get a forecast preview + queued nudge. Other markers feed
// below. Mobile floating nav; desktop is the same content, wider.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { MARKERS } from "@/lib/markers";
import { buildForecast } from "@/lib/forecast";
import { markerHint } from "@/lib/copy";
import { daysAgo, formatDate, softDate } from "@/lib/format";
import { statusSide } from "@/lib/status";
import {
  Avatar,
  Blob,
  BottomNav,
  Button,
  Disclaimer,
  Icon,
  StatusChip,
  Wordmark,
} from "@/components/ui";
import { ForecastChart } from "@/components/ForecastChart";
import { PcosLens } from "@/components/PcosLens";
import type { Forecast, MarkerReading, Profile } from "@/lib/types";

function heroStatusText(m: MarkerReading, sex: Profile["sex"]): string {
  if (m.status === "in") return "In range";
  const def = MARKERS[m.markerId];
  const t = def?.thresholds;
  const side = statusSide(m.markerId, m.value, sex);
  if (m.status === "low") {
    if (side === "above") return `Above ${t?.high ?? ""}`.trim();
    return `Below ${t?.low ?? ""}`.trim();
  }
  return "Near the edge";
}

export default function DashboardPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const parse = useBaseline((s) => s.parse);

  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !profile) router.replace("/start");
    else if (hydrated && profile && !parse) router.replace("/upload");
  }, [hydrated, profile, parse, router]);

  if (!hydrated || !profile || !parse) {
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

  const markers = parse.markers;
  const selectedId =
    selected ||
    markers.find((m) => m.markerId === "vitamin_d")?.markerId ||
    markers[0]?.markerId;
  const hero = markers.find((m) => m.markerId === selectedId) || markers[0];
  const heroDef = MARKERS[hero.markerId];
  const testDate = parse.testDate || new Date().toISOString().slice(0, 10);

  const heroForecast: Forecast | null =
    heroDef?.inV1Forecast && heroDef.thresholds
      ? buildForecast(hero.markerId, hero.value, new Date(testDate), profile)
      : null;

  const lowN = markers.filter((m) => m.status === "low").length;
  const watchN = markers.filter((m) => m.status === "watch").length;
  const summary =
    lowN > 0
      ? `${lowN} low${watchN ? ` · ${watchN} watch` : ""}`
      : watchN > 0
        ? `${watchN} watch`
        : "all in range";

  const others = markers.filter((m) => m.markerId !== hero.markerId);

  return (
    <main style={{ minHeight: "100vh", background: tok.paper, position: "relative", overflow: "hidden" }}>
      <Blob size={380} top={-160} right={-110} color={tok.sageMid} blur={20} />
      <Blob size={240} bottom={-110} left={-80} color={tok.redSoft} blur={20} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1120,
          margin: "0 auto",
          padding: "20px 22px 120px",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span className="hi-label">Hey there</span>
            <div
              style={{
                fontFamily: tok.font,
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                marginTop: 2,
              }}
            >
              {profile.firstName}.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              variant="secondary"
              onClick={() => router.push("/upload")}
              style={{ padding: "10px 16px", fontSize: 13 }}
            >
              <Icon name="upload" size={14} stroke={tok.ink} strokeWidth={2} />
              New report
            </Button>
            <Avatar size={42} letter={profile.firstName[0]?.toUpperCase() || "B"} notification />
          </div>
        </div>

        {/* baseline meta */}
        <div
          style={{
            marginTop: 22,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div>
            <span className="hi-label">Your baseline</span>
            <h1
              style={{
                fontFamily: tok.font,
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                margin: "4px 0 0",
              }}
            >
              Tested {formatDate(testDate)}.
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontFamily: tok.font,
                fontSize: 12,
                fontWeight: 800,
                color: tok.mute,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {parse.labName || "Manual entry"}
            </span>
            <span
              style={{
                fontFamily: tok.font,
                fontSize: 12,
                fontWeight: 800,
                color: lowN ? tok.red : watchN ? tok.amber : tok.ink2,
                padding: "5px 12px",
                borderRadius: 99,
                background: lowN ? tok.redSoft : watchN ? tok.amberSoft : tok.sageMid,
              }}
            >
              {summary}
            </span>
          </div>
        </div>

        {/* scroll selector */}
        <div className="no-scrollbar" style={{ marginTop: 18, overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
            {markers.map((m) => {
              const def = MARKERS[m.markerId];
              const active = m.markerId === hero.markerId;
              if (active) {
                return (
                  <div
                    key={m.markerId}
                    style={{
                      flex: "0 0 auto",
                      height: 56,
                      padding: "6px 16px 6px 6px",
                      borderRadius: 99,
                      background: tok.ink,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 99,
                        background:
                          m.status === "low"
                            ? tok.red
                            : m.status === "watch"
                              ? tok.amber
                              : tok.sageStrong,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={def?.icon || "info"} size={20} stroke={tok.white} strokeWidth={2} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: tok.font,
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          color: "rgba(255,255,255,.55)",
                          textTransform: "uppercase",
                        }}
                      >
                        {def?.name}
                      </div>
                      <div style={{ fontFamily: tok.font, fontSize: 12, fontWeight: 800, color: tok.white, marginTop: 1 }}>
                        {m.status === "low"
                          ? "Low · attention"
                          : m.status === "watch"
                            ? "Watch"
                            : "In range"}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <button
                  key={m.markerId}
                  type="button"
                  onClick={() => setSelected(m.markerId)}
                  style={{
                    flex: "0 0 auto",
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: tok.white,
                    border: `1px solid ${tok.sageSoft}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    cursor: "pointer",
                  }}
                >
                  <Icon name={def?.icon || "info"} size={17} stroke={tok.ink2} strokeWidth={1.8} />
                  <span style={{ fontFamily: tok.font, fontSize: 8.5, fontWeight: 800, color: tok.mute }}>
                    {def?.name.toUpperCase()}
                  </span>
                  {m.status !== "in" && (
                    <span
                      style={{
                        position: "relative",
                        marginTop: -1,
                        width: 5,
                        height: 5,
                        borderRadius: 99,
                        background: m.status === "low" ? tok.red : tok.amber,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* hero + forecast */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2"
          style={{ gap: 14, marginTop: 14, alignItems: "start" }}
        >
          {/* hero card */}
          <div className="hi-card" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
            <Blob size={130} top={-30} right={-30} color={tok.sageMid} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: tok.white,
                    border: `1px solid ${tok.sageSoft}`,
                    boxShadow: tok.shadowSm,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={heroDef?.icon || "info"} size={26} stroke={tok.ink} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="hi-label">{heroDef?.fullName}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                    <span
                      className="hi-num"
                      style={{
                        fontFamily: tok.font,
                        fontSize: 32,
                        fontWeight: 900,
                        color: tok.ink,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {hero.value}
                    </span>
                    <span style={{ fontFamily: tok.font, fontSize: 13, fontWeight: 700, color: tok.mute }}>
                      {hero.unit}
                    </span>
                  </div>
                </div>
                <StatusChip kind={hero.status} />
              </div>

              {/* bento */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                <div className="hi-bento" style={{ padding: 12 }}>
                  <div className="hi-label">Status</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 99,
                        background:
                          hero.status === "low"
                            ? tok.red
                            : hero.status === "watch"
                              ? tok.amber
                              : tok.ink,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: tok.font,
                        fontSize: 14,
                        fontWeight: 900,
                        color:
                          hero.status === "low"
                            ? tok.red
                            : hero.status === "watch"
                              ? tok.amber
                              : tok.ink,
                      }}
                    >
                      {heroStatusText(hero, profile.sex)}
                    </span>
                  </div>
                </div>
                <div className="hi-bento" style={{ padding: 12 }}>
                  <div className="hi-label">{heroForecast ? "Forecast" : "Healthy range"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <Icon
                      name={heroForecast ? "bell" : "check"}
                      size={13}
                      stroke={tok.ink}
                      strokeWidth={2.2}
                    />
                    <span style={{ fontFamily: tok.font, fontSize: 13, fontWeight: 900, color: tok.ink }}>
                      {heroForecast
                        ? heroForecast.alreadyBelow
                          ? "Under the line"
                          : heroForecast.crossingDate
                            ? `Crosses ${softDate(heroForecast.crossingDate)}`
                            : "Holding steady"
                        : heroDef
                          ? `${heroDef.thresholds?.low ?? heroDef.thresholdsMale?.low ?? ""}–${heroDef.thresholds?.high ?? heroDef.thresholdsMale?.high ?? ""} ${heroDef.unit}`
                          : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* hint */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 12,
                  marginTop: 12,
                  borderRadius: 16,
                  background: tok.sageSoft,
                  alignItems: "flex-start",
                }}
              >
                <Icon name="info" size={14} stroke={tok.ink2} strokeWidth={2} />
                <span style={{ fontFamily: tok.font, fontSize: 12, fontWeight: 600, color: tok.ink2, lineHeight: 1.45 }}>
                  {markerHint(hero.markerId, hero.status)}
                </span>
              </div>

              {heroForecast && (
                <Button
                  variant="dark"
                  onClick={() => router.push(`/forecast/${hero.markerId}`)}
                  style={{ width: "100%", marginTop: 12, fontSize: 14 }}
                >
                  See the forecast
                  <Icon name="arrow" size={15} stroke={tok.white} strokeWidth={2.4} />
                </Button>
              )}
            </div>
          </div>

          {/* forecast preview + nudge */}
          {heroForecast ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="hi-card" style={{ padding: 22, position: "relative", overflow: "hidden" }}>
                <Blob size={110} top={-26} right={-26} color={tok.redSoft} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <span className="hi-label">Forecast · {heroDef?.name}</span>
                  <h3
                    style={{
                      fontFamily: tok.font,
                      fontSize: 19,
                      fontWeight: 900,
                      letterSpacing: "-0.01em",
                      margin: "6px 0 14px",
                      lineHeight: 1.2,
                    }}
                  >
                    {heroForecast.alreadyBelow ? (
                      <>
                        Already under{" "}
                        <span style={{ color: tok.red }}>
                          {heroDef?.thresholds?.low}.
                        </span>
                      </>
                    ) : heroForecast.crossingDate ? (
                      <>
                        Likely crosses{" "}
                        <span style={{ color: tok.red }}>
                          {heroDef?.thresholds?.low} in {softDate(heroForecast.crossingDate)}.
                        </span>
                      </>
                    ) : (
                      <>Holding above the line for now.</>
                    )}
                  </h3>
                  <ForecastChart
                    forecast={heroForecast}
                    threshold={heroDef!.thresholds!.low}
                    unit={heroDef!.unit}
                    compact
                  />
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/forecast/${hero.markerId}`)}
                    style={{ width: "100%", marginTop: 16, fontSize: 13 }}
                  >
                    Open full forecast
                    <Icon name="arrow" size={14} stroke={tok.ink} strokeWidth={2.2} />
                  </Button>
                </div>
              </div>

              {/* nudge queued */}
              <div
                style={{
                  background: tok.ink,
                  borderRadius: 24,
                  padding: 20,
                  color: tok.white,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Blob size={130} bottom={-55} right={-55} color="rgba(202,0,19,.3)" blur={20} />
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
                      WE&apos;LL CHECK IN
                    </span>
                  </div>
                  <div style={{ fontFamily: tok.font, fontSize: 20, fontWeight: 900, marginTop: 10 }}>
                    {heroForecast.nudgeDate
                      ? `around ${softDate(heroForecast.nudgeDate)}`
                      : "soon"}
                  </div>
                  <div
                    style={{
                      fontFamily: tok.font,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgba(255,255,255,.7)",
                      marginTop: 4,
                      lineHeight: 1.45,
                    }}
                  >
                    A gentle nudge to re-test before this starts to drift.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="hi-card"
              style={{
                padding: 22,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span className="hi-label">Forecast</span>
              <p style={{ fontFamily: tok.font, fontSize: 14, fontWeight: 600, color: tok.ink2, margin: 0, lineHeight: 1.5 }}>
                We forecast Vitamin D and B12 in v1. {heroDef?.name} tracking, no
                projection yet — more markers soon.
              </p>
            </div>
          )}
        </div>

        {/* lifestyle CTA */}
        <button
          type="button"
          onClick={() => router.push("/improve")}
          className="hi-card"
          style={{
            marginTop: 22,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            textAlign: "left",
            cursor: "pointer",
            background: tok.ink,
            border: "none",
            color: tok.white,
            position: "relative",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <Blob size={140} top={-40} right={-50} color="rgba(202,0,19,.28)" blur={28} />
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              flex: "0 0 auto",
              position: "relative",
              zIndex: 1,
            }}
          >
            🌱
          </div>
          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontFamily: tok.font,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,.6)",
              }}
            >
              LIFESTYLE
            </div>
            <div
              style={{
                fontFamily: tok.font,
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: "-0.01em",
                marginTop: 2,
              }}
            >
              Things you can do<span style={{ color: tok.red }}>.</span>
            </div>
            <div
              style={{
                fontFamily: tok.font,
                fontSize: 12,
                fontWeight: 500,
                color: "rgba(255,255,255,.65)",
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
              Personalised moves for your markers — food, sun, movement. No
              supplements, no diagnoses.
            </div>
          </div>
          <span
            style={{
              flex: "0 0 auto",
              fontFamily: tok.font,
              fontSize: 14,
              fontWeight: 800,
              color: tok.white,
              opacity: 0.8,
              position: "relative",
              zIndex: 1,
            }}
          >
            →
          </span>
        </button>

        {/* other markers */}
        {others.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                margin: "22px 0 10px",
              }}
            >
              <span className="hi-label">Other markers</span>
              <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 800, color: tok.mute, letterSpacing: "0.04em" }}>
                {markers.length} · TESTED {daysAgo(testDate)} DAYS AGO
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {others.map((m) => {
                const def = MARKERS[m.markerId];
                const fg =
                  m.status === "low" ? tok.red : m.status === "watch" ? tok.amber : tok.ink2;
                return (
                  <button
                    key={m.markerId}
                    type="button"
                    onClick={() => {
                      setSelected(m.markerId);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="hi-card-nested"
                    style={{
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 99,
                        background: `${def?.accent || tok.sage}22`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      <Icon name={def?.icon || "info"} size={20} stroke={def?.accent || tok.ink2} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ fontFamily: tok.font, fontSize: 15, fontWeight: 800, color: tok.ink }}>
                          {def?.name}
                        </span>
                        <span className="hi-num" style={{ fontFamily: tok.font, fontSize: 13, fontWeight: 800, color: fg }}>
                          {m.value}
                        </span>
                        <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: tok.mute }}>
                          {m.unit}
                        </span>
                      </div>
                      <div style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: tok.mute, marginTop: 2 }}>
                        {m.status === "low"
                          ? "Needs attention"
                          : m.status === "watch"
                            ? "Worth watching"
                            : "In range"}
                      </div>
                    </div>
                    <StatusChip kind={m.status} variant="plain" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {profile.pcosTracking && (
          <div style={{ marginTop: 18 }}>
            <PcosLens markers={markers} />
          </div>
        )}

        <Disclaimer style={{ marginTop: 20, maxWidth: 560 }} />
      </div>

      <div className="lg:hidden">
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 88 }}>
          <div style={{ position: "relative", maxWidth: 480, margin: "0 auto", height: "100%" }}>
            <BottomNav active={0} onFab={() => router.push("/upload")} onHome={() => {}} />
          </div>
        </div>
      </div>
    </main>
  );
}
