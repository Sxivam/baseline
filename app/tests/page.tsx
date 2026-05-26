"use client";

// Lab tests marketplace — aggregated home-based panels across the major Indian
// labs. Sorted by what you actually need to re-test. Reads ?markers= from the
// URL (deep-linked from /forecast/[marker]) and from the user's low/watch
// markers in the store.

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { MARKERS, MARKER_ORDER } from "@/lib/markers";
import { EDUCATION } from "@/lib/education";
import { PANELS, lastDataRefresh } from "@/lib/panels";
import { recommend, type ScoredPanel } from "@/lib/recommend";
import { formatDate } from "@/lib/format";
import { Blob, Disclaimer, Icon, Wordmark } from "@/components/ui";
import {
  buildExplainInput,
  type ForecastSummary,
  type RecommendExplainOutput,
} from "@/lib/recommend-explain";
import { buildForecast } from "@/lib/forecast";
import { softDate } from "@/lib/format";

export default function TestsPage() {
  return (
    <Suspense fallback={<Splash />}>
      <TestsPageInner />
    </Suspense>
  );
}

function TestsPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const parse = useBaseline((s) => s.parse);

  const queryMarkers = useMemo(() => {
    const m = search.get("markers") || search.get("marker") || "";
    return m
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && MARKERS[s]);
  }, [search]);

  // First-time visitors come from the landing page via /start?next=tests.
  // No parse data yet → show baseline-panel framing instead of "re-test".
  const firstTime = search.get("firstTime") === "1" || !parse;

  const [selectedMarkers, setSelectedMarkers] = useState<string[]>([]);
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [homeOnly, setHomeOnly] = useState(false);
  const [initFromStore, setInitFromStore] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [bundleHint, setBundleHint] = useState<string | null>(null);

  // Default selected: from URL ?markers=, else from the user's low/watch markers.
  useEffect(() => {
    if (queryMarkers.length > 0) {
      setSelectedMarkers(queryMarkers);
      setInitFromStore(true);
      return;
    }
    if (hydrated && parse && !initFromStore) {
      const attention = parse.markers
        .filter((m) => m.status === "low" || m.status === "watch")
        .map((m) => m.markerId);
      setSelectedMarkers(attention);
      setInitFromStore(true);
    }
  }, [queryMarkers, hydrated, parse, initFromStore]);

  // Personalised "why this for you" rationales for the top recommended panels.
  // Fires when the active set of attention markers / lab filters changes.
  // Falls back gracefully if no key / §7 gate fails — the page still renders.
  const recommendedKey = useMemo(
    () => selectedMarkers.slice().sort().join("|"),
    [selectedMarkers],
  );
  const labsKey = useMemo(
    () => selectedLabs.slice().sort().join("|"),
    [selectedLabs],
  );

  useEffect(() => {
    if (!hydrated || !profile || selectedMarkers.length === 0) {
      setExplanations({});
      setBundleHint(null);
      return;
    }
    // Compute the top-3 here so this effect doesn't depend on the `recommended`
    // array reference (which re-creates each render).
    let p = PANELS;
    if (selectedLabs.length > 0) p = p.filter((x) => selectedLabs.includes(x.lab));
    if (homeOnly) p = p.filter((x) => x.sampleType === "home" || x.sampleType === "both");
    const top = recommend(selectedMarkers, p).slice(0, 3);
    if (top.length === 0) {
      setExplanations({});
      setBundleHint(null);
      return;
    }

    // Forecast summary for the first forecastable attention marker (D/B12) —
    // gives the LLM the timing context to write "before late October" copy.
    const fcId = selectedMarkers.find((m) => MARKERS[m]?.inV1Forecast);
    const fcReading = parse?.markers.find((m) => m.markerId === fcId);
    let forecastSummary: ForecastSummary | null = null;
    if (fcId && fcReading && parse?.testDate && MARKERS[fcId]?.thresholds) {
      const f = buildForecast(fcId, fcReading.value, new Date(parse.testDate), profile);
      forecastSummary = {
        markerId: fcId,
        last_value: fcReading.value,
        current_estimate: fcReading.value,
        projected_date: f.crossingDate ? softDate(f.crossingDate) : "the coming months",
        threshold: MARKERS[fcId]!.thresholds!.low,
      };
    }

    const input = buildExplainInput(profile, selectedMarkers, forecastSummary, top);
    const controller = new AbortController();
    fetch("/api/recommend-explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: RecommendExplainOutput & { source?: string }) => {
        const map: Record<string, string> = {};
        for (const r of data.rationales || []) map[r.panelId] = r.rationale;
        setExplanations(map);
        setBundleHint(data.bundleHint ?? null);
      })
      .catch(() => {
        /* aborted or failed — cards still render, just without LLM copy */
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, profile, recommendedKey, labsKey, homeOnly]);

  const toggleMarker = (m: string) =>
    setSelectedMarkers((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));
  const toggleLab = (l: string) =>
    setSelectedLabs((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l]));

  const labs = useMemo(
    () => Array.from(new Set(PANELS.map((p) => p.lab))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    let p = PANELS;
    if (selectedLabs.length > 0) p = p.filter((x) => selectedLabs.includes(x.lab));
    if (homeOnly) p = p.filter((x) => x.sampleType === "home" || x.sampleType === "both");
    return p;
  }, [selectedLabs, homeOnly]);

  const scored = useMemo(
    () => recommend(selectedMarkers, filtered),
    [selectedMarkers, filtered],
  );

  const recommended = selectedMarkers.length > 0 ? scored.slice(0, 3) : [];
  const others =
    selectedMarkers.length > 0
      ? scored.slice(3)
      : filtered
          .map((p) => recommend([], [p])[0])
          .sort((a, b) => a.panel.price - b.panel.price);

  const firstEdu = selectedMarkers[0] ? EDUCATION[selectedMarkers[0]] : undefined;

  return (
    <main style={{ minHeight: "100vh", background: tok.paper, position: "relative", overflow: "hidden" }}>
      <Blob size={360} top={-150} right={-110} color={tok.sageMid} blur={20} />
      <Blob size={220} bottom={-90} left={-70} color={tok.redSoft} blur={20} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1000,
          margin: "0 auto",
          padding: "24px 22px 60px",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            type="button"
            onClick={() => router.back()}
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
          <span className="hi-label">Lab tests</span>
          <Wordmark size={16} />
        </div>

        {/* title — first-timer copy vs re-test copy */}
        <div style={{ marginTop: 24 }}>
          {firstTime ? (
            <>
              <h1
                style={{
                  fontFamily: tok.font,
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                Your first <span style={{ color: tok.red }}>baseline panel.</span>
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
                Most people start with a comprehensive panel that covers Vitamin D,
                B12, iron, lipids, sugar, and thyroid. Aggregated across{" "}
                {labs.length} labs, home-collection where available. Book one, drop
                the report back here, and the loop starts.
              </p>
              <div
                style={{
                  marginTop: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 99,
                  background: tok.ink,
                  color: tok.white,
                }}
              >
                <span
                  style={{
                    fontFamily: tok.font,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,.85)",
                  }}
                >
                  Tip
                </span>
                <span
                  style={{
                    fontFamily: tok.font,
                    fontSize: 12,
                    fontWeight: 700,
                    color: tok.white,
                  }}
                >
                  Use the marker filter below if you already know what you want.
                </span>
              </div>
            </>
          ) : (
            <>
              <h1
                style={{
                  fontFamily: tok.font,
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                Find a re-test <span style={{ color: tok.red }}>panel.</span>
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
                Aggregated home-based blood tests across {labs.length} labs. Sorted by
                what you actually need to re-test — not by who pays the most. Prices
                refreshed nightly.
              </p>
            </>
          )}
        </div>

        {/* marker filter */}
        <div style={{ marginTop: 22 }}>
          <span className="hi-label">Filter by marker</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {MARKER_ORDER.map((m) => {
              const def = MARKERS[m];
              const active = selectedMarkers.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMarker(m)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 99,
                    border: `1px solid ${active ? tok.ink : tok.sage}`,
                    background: active ? tok.ink : tok.white,
                    color: active ? tok.white : tok.ink,
                    fontFamily: tok.font,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <Icon
                    name={def.icon}
                    size={13}
                    stroke={active ? tok.white : tok.ink}
                    strokeWidth={2}
                  />
                  {def.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* education strip — when a single marker is selected */}
        {firstEdu && selectedMarkers.length === 1 && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 16,
              background: tok.white,
              border: `1px solid ${tok.sageSoft}`,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Icon name="info" size={14} stroke={tok.ink2} strokeWidth={2} />
            <div>
              <div style={{ fontFamily: tok.font, fontSize: 13, fontWeight: 800, color: tok.ink }}>
                {MARKERS[selectedMarkers[0]].name}
              </div>
              <div
                style={{
                  fontFamily: tok.font,
                  fontSize: 12,
                  fontWeight: 500,
                  color: tok.ink2,
                  lineHeight: 1.45,
                  marginTop: 2,
                }}
              >
                {firstEdu.whatItTellsYou}{" "}
                <span style={{ color: tok.mute }}>· {firstEdu.frequency}</span>
              </div>
            </div>
          </div>
        )}

        {/* lab + sample filter */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {labs.map((l) => {
            const active = selectedLabs.includes(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggleLab(l)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 99,
                  border: `1px solid ${active ? tok.ink : tok.sageSoft}`,
                  background: active ? tok.ink : "transparent",
                  color: active ? tok.white : tok.ink2,
                  fontFamily: tok.font,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {l}
              </button>
            );
          })}
          <span style={{ width: 1, height: 18, background: tok.sageSoft, margin: "0 4px" }} />
          <button
            type="button"
            onClick={() => setHomeOnly((v) => !v)}
            style={{
              padding: "6px 12px",
              borderRadius: 99,
              border: `1px solid ${homeOnly ? tok.ink : tok.sageSoft}`,
              background: homeOnly ? tok.ink : "transparent",
              color: homeOnly ? tok.white : tok.ink2,
              fontFamily: tok.font,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Home collection only
          </button>
        </div>

        {/* Recommended */}
        {recommended.length > 0 && (
          <div style={{ marginTop: 26 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <span className="hi-label">
                Recommended for {selectedMarkers.map((m) => MARKERS[m].name).join(" + ")}
              </span>
              <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 500, color: tok.mute }}>
                Verified {formatDate(lastDataRefresh())}
              </span>
            </div>

            {bundleHint && (
              <div
                style={{
                  marginTop: 10,
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: tok.ink,
                  color: tok.white,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    flex: "0 0 auto",
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    background: tok.red,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="spark" size={13} stroke={tok.white} strokeWidth={2.5} />
                </div>
                <span style={{ fontFamily: tok.font, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>
                  {bundleHint}
                </span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {recommended.map((s, i) => (
                <PanelCard
                  key={s.panel.id}
                  s={s}
                  recommended={i === 0}
                  rationale={explanations[s.panel.id]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other panels / All */}
        <div style={{ marginTop: 26 }}>
          <span className="hi-label">
            {selectedMarkers.length > 0 ? "Other options" : "All panels"}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {others.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  background: tok.white,
                  border: `1px solid ${tok.sageSoft}`,
                  fontFamily: tok.font,
                  fontSize: 13,
                  color: tok.ink2,
                }}
              >
                No panels match — try clearing a filter.
              </div>
            ) : (
              others.map((s) => <PanelCard key={s.panel.id} s={s} recommended={false} />)
            )}
          </div>
        </div>

        <Disclaimer style={{ marginTop: 22 }} />
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
          Each panel links straight to the lab&apos;s main diagnostics page —
          search the test name there to book (lab-specific URLs change often,
          so we point at the front door). Prices are aggregated from public lab
          pages and refreshed nightly by the scraper in <code>scripts/</code>;
          always confirm the live price on the lab&apos;s site before booking.
        </p>
      </div>
    </main>
  );
}

function PanelCard({
  s,
  recommended,
  rationale,
}: {
  s: ScoredPanel;
  recommended: boolean;
  rationale?: string;
}) {
  const p = s.panel;
  const showWaste =
    s.extraMarkers.length > 2 && s.waste > 0.5 && s.coveredMarkers.length > 0;
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 22,
        background: tok.white,
        border: `1.5px solid ${recommended ? tok.ink : tok.sageSoft}`,
        boxShadow: recommended ? tok.shadowSm : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: tok.font,
                fontSize: 10,
                fontWeight: 800,
                color: tok.mute,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {p.lab}
            </span>
            {recommended && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: tok.ink,
                  color: tok.white,
                  fontFamily: tok.font,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <Icon name="check" size={9} stroke={tok.white} strokeWidth={3} />
                Best fit
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 17,
              fontWeight: 900,
              color: tok.ink,
              marginTop: 4,
              letterSpacing: "-0.01em",
            }}
          >
            {p.name}
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          <div
            className="hi-num"
            style={{
              fontFamily: tok.font,
              fontSize: 26,
              fontWeight: 900,
              color: tok.ink,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            ₹{p.price}
          </div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 11,
              fontWeight: 700,
              color: tok.mute,
              marginTop: 4,
            }}
          >
            {p.sampleType === "home" ? "Home · " : p.sampleType === "lab" ? "Lab · " : "Home / lab · "}
            {p.tat}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
        {s.coveredMarkers.map((m) => (
          <span
            key={m}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 99,
              background: tok.ink,
              color: tok.white,
              fontFamily: tok.font,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            <Icon name="check" size={9} stroke={tok.white} strokeWidth={3} />
            {MARKERS[m]?.name ?? m}
          </span>
        ))}
        {s.extraMarkers.slice(0, 5).map((m) => (
          <span
            key={m}
            style={{
              padding: "3px 8px",
              borderRadius: 99,
              border: `1px solid ${tok.sageSoft}`,
              color: tok.mute,
              fontFamily: tok.font,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {MARKERS[m]?.name ?? m}
          </span>
        ))}
        {s.extraMarkers.length > 5 && (
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 99,
              color: tok.mute,
              fontFamily: tok.font,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            +{s.extraMarkers.length - 5} more
          </span>
        )}
      </div>

      {rationale && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 14,
            background: tok.sageSoft,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <Icon name="spark" size={12} stroke={tok.ink2} strokeWidth={2.2} />
          <span
            style={{
              fontFamily: tok.font,
              fontSize: 12,
              fontWeight: 600,
              color: tok.ink2,
              lineHeight: 1.5,
            }}
          >
            {rationale}
          </span>
        </div>
      )}

      {showWaste && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 12,
            background: tok.amberSoft,
            fontFamily: tok.font,
            fontSize: 11,
            fontWeight: 600,
            color: tok.amber,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="info" size={11} stroke={tok.amber} strokeWidth={2.4} />
          {p.markers.length} markers, you need {s.coveredMarkers.length} — overkill
          for a single re-test.
        </div>
      )}

      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 14,
          padding: "9px 14px",
          borderRadius: 99,
          border: `1px solid ${tok.sage}`,
          fontFamily: tok.font,
          fontSize: 12,
          fontWeight: 800,
          color: tok.ink,
          textDecoration: "none",
        }}
      >
        Book on {p.lab}
        <Icon name="arrow" size={12} stroke={tok.ink} strokeWidth={2.2} />
      </a>
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
