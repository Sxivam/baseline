"use client";

// Landing page — the hook. Indian deficiency stats up top, the
// "you-look-fine-but-the-inside-story-is-different" angle, three-step
// explainer, two CTAs at the bottom (one for users who already have a
// report, one for users who haven't tested yet — they go to the panel
// marketplace first).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { Blob, Disclaimer, Icon, Wordmark } from "@/components/ui";

// Stats are conservative figures from widely-cited Indian studies + NFHS-5.
// Kept as ranges where the literature varies; phrased honestly.
const STATS = [
  {
    pct: "76%",
    label: "of Indians are Vitamin D deficient",
    note: "Across urban + rural studies — even sunny states.",
    accent: "#ca0013",
  },
  {
    pct: "47%",
    label: "of Indians are low on Vitamin B12",
    note: "Closer to 70% for vegetarians (most of the country).",
    accent: "#a76c00",
  },
  {
    pct: "57%",
    label: "of Indian women are anemic",
    note: "NFHS-5 — ages 15-49. Iron stores quietly run dry.",
    accent: "#ca0013",
  },
  {
    pct: "1 in 4",
    label: "young Indians have early metabolic flags",
    note: "Prediabetes, lipid drift, or thyroid edges — usually unnoticed.",
    accent: "#a76c00",
  },
];

const FEATURES = [
  {
    step: "01",
    title: "One test, ongoing baseline",
    body: "Drop your blood report. Baseline parses every relevant marker — D, B12, iron, lipids, thyroid, sugar — and shows where you actually stand.",
  },
  {
    step: "02",
    title: "Forecast what's drifting",
    body: "Vitamin D drops in winter. B12 drifts on plant-leaning diets. We project when each marker likely crosses the line so you act before it does.",
  },
  {
    step: "03",
    title: "Held to it, gently",
    body: "A four-week plan curated to your markers + a weekly check-in inbox. Test → act → re-test. No upsells, no dosing, no diagnosis.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const parse = useBaseline((s) => s.parse);
  const plan = useBaseline((s) => s.plan);

  // Returning users with an accepted plan → drop them on the dashboard.
  useEffect(() => {
    if (!hydrated) return;
    if (profile && parse && plan?.startedAt) {
      router.replace("/dashboard");
    }
  }, [hydrated, profile, parse, plan, router]);

  return (
    <main style={{ minHeight: "100vh", background: tok.paper, position: "relative", overflow: "hidden" }}>
      <Blob size={420} top={-180} right={-120} color={tok.sageMid} blur={30} />
      <Blob size={260} bottom={-90} left={-90} color={tok.redSoft} blur={28} />

      {/* nav */}
      <nav
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1080,
          margin: "0 auto",
          padding: "24px 22px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Wordmark size={20} />
        <button
          type="button"
          onClick={() => router.push("/start?next=upload")}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            border: `1px solid ${tok.ink}`,
            background: "transparent",
            color: tok.ink,
            fontFamily: tok.font,
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          I have a report →
        </button>
      </nav>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1080,
          margin: "0 auto",
          padding: "40px 22px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 60,
        }}
      >
        {/* hero */}
        <section style={{ textAlign: "center", padding: "20px 0 0" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 99,
              background: tok.white,
              border: `1px solid ${tok.sageSoft}`,
              boxShadow: tok.shadowSm,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: tok.red,
              }}
            />
            <span
              style={{
                fontFamily: tok.font,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.1em",
                color: tok.ink2,
                textTransform: "uppercase",
              }}
            >
              Tracking, not diagnosis
            </span>
          </div>

          <h1
            style={{
              fontFamily: tok.font,
              fontSize: "clamp(40px, 7vw, 72px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: tok.ink,
              margin: "22px 0 0",
              lineHeight: 1.02,
            }}
          >
            Don&apos;t wait for a health scare.
            <br />
            <span style={{ color: tok.red }}>
              Your blood might tell a different story
              <span style={{ color: tok.ink }}>.</span>
            </span>
          </h1>

          <p
            style={{
              fontFamily: tok.font,
              fontSize: 17,
              fontWeight: 500,
              color: tok.ink2,
              lineHeight: 1.55,
              maxWidth: 640,
              margin: "22px auto 0",
            }}
          >
            You look great. Most Indians don&apos;t test until something breaks —
            and by then the easy fixes are gone. Baseline turns one report into
            an ongoing baseline: projected, nudged, held accountable.{" "}
            <b style={{ color: tok.ink, fontWeight: 800 }}>Get tested today.</b>
          </p>

          {/* primary CTAs */}
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/start?next=tests")}
              style={{
                padding: "16px 28px",
                borderRadius: 999,
                background: tok.red,
                color: tok.white,
                border: "none",
                fontFamily: tok.font,
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: tok.shadowRed,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              I haven&apos;t been tested — find a panel
              <Icon name="arrow" size={15} stroke={tok.white} strokeWidth={2.6} />
            </button>
            <button
              type="button"
              onClick={() => router.push("/start?next=upload")}
              style={{
                padding: "16px 28px",
                borderRadius: 999,
                background: tok.white,
                color: tok.ink,
                border: `1px solid ${tok.ink}`,
                fontFamily: tok.font,
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              I have a recent report →
            </button>
          </div>
        </section>

        {/* stats grid */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <h2
              style={{
                fontFamily: tok.font,
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: tok.ink,
                margin: 0,
              }}
            >
              Most Indians are deficient in something
              <span style={{ color: tok.red }}>.</span>
            </h2>
            <span
              style={{
                fontFamily: tok.font,
                fontSize: 12,
                fontWeight: 700,
                color: tok.mute,
                letterSpacing: "0.04em",
              }}
            >
              SOURCES: NFHS-5 · ICMR · IRDS
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {STATS.map((s, i) => (
              <article
                key={i}
                style={{
                  background: tok.white,
                  border: `1px solid ${tok.sageSoft}`,
                  borderRadius: 24,
                  padding: 22,
                  boxShadow: tok.shadowSm,
                  position: "relative",
                  overflow: "hidden",
                  minHeight: 160,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -30,
                    right: -30,
                    width: 100,
                    height: 100,
                    borderRadius: 99,
                    background: `${s.accent}14`,
                    filter: "blur(20px)",
                  }}
                />
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      fontFamily: tok.font,
                      fontSize: "clamp(40px, 6vw, 52px)",
                      fontWeight: 900,
                      letterSpacing: "-0.03em",
                      color: s.accent,
                      lineHeight: 1,
                    }}
                  >
                    {s.pct}
                  </div>
                  <div
                    style={{
                      fontFamily: tok.font,
                      fontSize: 14,
                      fontWeight: 800,
                      color: tok.ink,
                      letterSpacing: "-0.005em",
                      marginTop: 8,
                      lineHeight: 1.35,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
                <div
                  style={{
                    position: "relative",
                    fontFamily: tok.font,
                    fontSize: 12,
                    fontWeight: 500,
                    color: tok.ink2,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: `1px dashed ${tok.sage}80`,
                    lineHeight: 1.5,
                  }}
                >
                  {s.note}
                </div>
              </article>
            ))}
          </div>

          {/* one-line cinch */}
          <div
            style={{
              marginTop: 22,
              padding: "18px 22px",
              borderRadius: 24,
              background: tok.ink,
              color: tok.white,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <Blob size={140} top={-40} right={-40} color="rgba(202,0,19,.28)" blur={28} />
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
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
                The pattern
              </div>
              <div
                style={{
                  fontFamily: tok.font,
                  fontSize: 18,
                  fontWeight: 900,
                  color: tok.white,
                  marginTop: 4,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.3,
                }}
              >
                Slow drift, quiet symptoms, late detection.
              </div>
              <div
                style={{
                  fontFamily: tok.font,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,.7)",
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                Vitamin D drops in winter. B12 drifts on plant-leaning diets.
                Iron stores empty slowly. The body doesn&apos;t scream — until
                something else does.
              </div>
            </div>
          </div>
        </section>

        {/* three-step */}
        <section>
          <h2
            style={{
              fontFamily: tok.font,
              fontSize: "clamp(22px, 3vw, 28px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: tok.ink,
              margin: 0,
            }}
          >
            How Baseline works
            <span style={{ color: tok.red }}>.</span>
          </h2>
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 14,
              fontWeight: 500,
              color: tok.ink2,
              marginTop: 8,
              lineHeight: 1.55,
              maxWidth: 580,
            }}
          >
            One test cold-starts the loop. The loop is the product.
          </p>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {FEATURES.map((f) => (
              <article
                key={f.step}
                style={{
                  background: tok.white,
                  border: `1px solid ${tok.sageSoft}`,
                  borderRadius: 24,
                  padding: 22,
                  boxShadow: tok.shadowSm,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: tok.font,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    color: tok.red,
                    textTransform: "uppercase",
                  }}
                >
                  Step {f.step}
                </div>
                <h3
                  style={{
                    fontFamily: tok.font,
                    fontSize: 19,
                    fontWeight: 900,
                    color: tok.ink,
                    margin: 0,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.25,
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontFamily: tok.font,
                    fontSize: 13,
                    fontWeight: 500,
                    color: tok.ink2,
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* final CTA */}
        <section
          style={{
            background: tok.white,
            border: `1px solid ${tok.sageSoft}`,
            borderRadius: 32,
            padding: "40px 28px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: tok.shadow,
          }}
        >
          <Blob size={260} top={-100} right={-100} color={tok.sageMid} blur={28} />
          <Blob size={160} bottom={-60} left={-60} color={tok.redSoft} blur={20} />
          <div style={{ position: "relative" }}>
            <h2
              style={{
                fontFamily: tok.font,
                fontSize: "clamp(28px, 4.5vw, 40px)",
                fontWeight: 900,
                letterSpacing: "-0.025em",
                color: tok.ink,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Find your baseline today
              <span style={{ color: tok.red }}>.</span>
            </h2>
            <p
              style={{
                fontFamily: tok.font,
                fontSize: 15,
                fontWeight: 500,
                color: tok.ink2,
                marginTop: 12,
                lineHeight: 1.55,
                maxWidth: 520,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Two minutes of profile, one report (or one panel booking), and
              you&apos;re on the loop. No payment, no card, no diagnosis.
            </p>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={() => router.push("/start?next=tests")}
                style={{
                  padding: "16px 28px",
                  borderRadius: 999,
                  background: tok.red,
                  color: tok.white,
                  border: "none",
                  fontFamily: tok.font,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: tok.shadowRed,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Book my first test
                <Icon name="arrow" size={15} stroke={tok.white} strokeWidth={2.6} />
              </button>
              <button
                type="button"
                onClick={() => router.push("/start?next=upload")}
                style={{
                  padding: "16px 28px",
                  borderRadius: 999,
                  background: tok.ink,
                  color: tok.white,
                  border: "none",
                  fontFamily: tok.font,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Upload a recent report →
              </button>
            </div>
          </div>
        </section>

        <Disclaimer style={{ maxWidth: 560, margin: "0 auto" }} />
      </div>
    </main>
  );
}
