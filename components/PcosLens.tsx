"use client";

// PCOS lifestyle lens — shown on the dashboard for female users who opted in.
// §7-safe: this is lifestyle tracking + awareness only. It NEVER screens,
// scores, or implies a PCOS diagnosis — that is a doctor's call.

import { useState } from "react";
import { tok } from "@/lib/tokens";
import { useBaseline } from "@/lib/store";
import { Icon } from "@/components/ui";
import type { CycleLog, MarkerReading } from "@/lib/types";

const REGULARITY: { key: NonNullable<CycleLog["regularity"]>; label: string }[] = [
  { key: "regular", label: "Regular" },
  { key: "irregular", label: "Irregular" },
  { key: "not-sure", label: "Not sure" },
];

// Awareness context for the metabolic markers — general, never personal diagnosis.
const PCOS_CONTEXT: Record<string, string> = {
  hba1c:
    "Insulin-resistance is a common thread in PCOS — HbA1c is the signal many people track.",
  fasting_glucose:
    "Fasting glucose pairs with HbA1c for the insulin-resistance picture.",
};

export function PcosLens({ markers }: { markers: MarkerReading[] }) {
  const cycle = useBaseline((s) => s.cycle);
  const setCycle = useBaseline((s) => s.setCycle);
  const [draft, setDraft] = useState<CycleLog>(
    cycle ?? { lastPeriodStart: null, cycleLength: null, regularity: null },
  );

  function update(patch: Partial<CycleLog>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setCycle(next);
  }

  const metabolic = markers.filter(
    (m) => m.markerId === "hba1c" || m.markerId === "fasting_glucose",
  );

  return (
    <div className="hi-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 99,
              background: tok.sageMid,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="spark" size={15} stroke={tok.ink} strokeWidth={2} />
          </div>
          <div>
            <span className="hi-label">PCOS lifestyle lens</span>
            <div style={{ fontFamily: tok.font, fontSize: 12, fontWeight: 600, color: tok.mute }}>
              Tracking, not screening
            </div>
          </div>
        </div>

        {/* cycle log */}
        <div style={{ marginTop: 18 }}>
          <span className="hi-label" style={{ color: tok.ink2 }}>
            Your cycle
          </span>
          <div
            className="grid grid-cols-1 sm:grid-cols-3"
            style={{ gap: 8, marginTop: 8 }}
          >
            <label>
              <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: tok.mute }}>
                Last period
              </span>
              <input
                type="date"
                value={draft.lastPeriodStart || ""}
                onChange={(e) => update({ lastPeriodStart: e.target.value || null })}
                style={inputStyle}
              />
            </label>
            <label>
              <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: tok.mute }}>
                Cycle length
              </span>
              <input
                inputMode="numeric"
                placeholder="28 days"
                value={draft.cycleLength ? String(draft.cycleLength) : ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                  update({ cycleLength: Number.isFinite(n) ? n : null });
                }}
                style={inputStyle}
              />
            </label>
            <div>
              <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: tok.mute }}>
                Regularity
              </span>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {REGULARITY.map((r) => {
                  const active = draft.regularity === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => update({ regularity: r.key })}
                      style={{
                        flex: 1,
                        padding: "9px 4px",
                        borderRadius: 10,
                        border: `1px solid ${active ? tok.ink : tok.sageSoft}`,
                        background: active ? tok.ink : tok.white,
                        color: active ? tok.white : tok.ink2,
                        fontFamily: tok.font,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* metabolic signals */}
        <div style={{ marginTop: 18 }}>
          <span className="hi-label" style={{ color: tok.ink2 }}>
            Signals worth watching
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {metabolic.length > 0 ? (
              metabolic.map((m) => (
                <div
                  key={m.markerId}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: 12,
                    borderRadius: 16,
                    background: tok.paper,
                    border: `1px solid ${tok.sageSoft}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                      flex: "0 0 auto",
                    }}
                  >
                    <span
                      className="hi-num"
                      style={{
                        fontFamily: tok.font,
                        fontSize: 18,
                        fontWeight: 900,
                        color:
                          m.status === "low"
                            ? tok.red
                            : m.status === "watch"
                              ? tok.amber
                              : tok.ink,
                      }}
                    >
                      {m.value}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: tok.font, fontSize: 13, fontWeight: 800, color: tok.ink }}>
                      {m.name}
                    </div>
                    <div style={{ fontFamily: tok.font, fontSize: 12, fontWeight: 500, color: tok.ink2, lineHeight: 1.4, marginTop: 2 }}>
                      {PCOS_CONTEXT[m.markerId]}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: 12,
                  borderRadius: 16,
                  background: tok.paper,
                  border: `1px solid ${tok.sageSoft}`,
                  fontFamily: tok.font,
                  fontSize: 12,
                  fontWeight: 500,
                  color: tok.ink2,
                  lineHeight: 1.45,
                }}
              >
                Add HbA1c or fasting glucose on your next upload to track the
                insulin-resistance angle people managing PCOS often watch.
              </div>
            )}
          </div>
        </div>

        {/* disclaimer */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            padding: "10px 12px",
            borderRadius: 14,
            background: tok.sageSoft,
          }}
        >
          <Icon name="info" size={13} stroke={tok.ink2} strokeWidth={2} />
          <span style={{ fontFamily: tok.font, fontSize: 11.5, fontWeight: 500, color: tok.ink2, lineHeight: 1.45 }}>
            This is lifestyle tracking — not a PCOS screen or diagnosis. PCOS can
            only be assessed by a qualified doctor.
          </span>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "9px 12px",
  borderRadius: 10,
  border: `1px solid ${tok.sageSoft}`,
  background: tok.white,
  fontFamily: tok.font,
  fontSize: 13,
  fontWeight: 700,
  color: tok.ink,
};
