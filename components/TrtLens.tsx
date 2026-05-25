"use client";

// TRT / HRT cycle tracking lens — shown on the dashboard for male users who
// opted into trtTracking on /start. §7-safe: this is a logbook for someone
// already on a prescribed protocol. Baseline NEVER prescribes doses, esters,
// frequencies, or any medical action. We only help the user log what their
// body is doing and connect it to the markers they already track.

import { useMemo, useState } from "react";
import { tok } from "@/lib/tokens";
import { useBaseline } from "@/lib/store";
import { Icon } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type {
  MarkerReading,
  TrtCompound,
  TrtLog,
  TrtStageEntry,
} from "@/lib/types";

// Default cycle days per compound — well-known half-lives, not dosing advice.
const COMPOUND_DEFAULTS: { value: TrtCompound; label: string; defaultDays: number }[] = [
  { value: "propionate", label: "Propionate", defaultDays: 3 },
  { value: "cypionate", label: "Cypionate", defaultDays: 7 },
  { value: "enanthate", label: "Enanthate", defaultDays: 7 },
  { value: "undecanoate", label: "Undecanoate", defaultDays: 84 },
  { value: "other", label: "Other / custom", defaultDays: 7 },
];

// What TRT users typically watch in their bloodwork — context only.
const TRT_MARKER_CONTEXT: Record<string, string> = {
  hdl: "TRT often nudges HDL down — worth watching the trend, not just one reading.",
  ldl: "Lipid shifts are common on TRT — pair with cardio and you'll see it react.",
  hba1c: "Insulin sensitivity tends to improve when testosterone normalises.",
  fasting_glucose: "Fasting glucose pairs with HbA1c for the metabolic picture.",
};

// Stage labels — descriptive, not prescriptive.
const STAGE_LABELS: Record<1 | 2 | 3 | 4 | 5, { label: string; hint: string }> = {
  1: { label: "Just after", hint: "Hours 0-24 post-shot" },
  2: { label: "Settling in", hint: "Day 1-2" },
  3: { label: "Steady", hint: "Mid-cycle" },
  4: { label: "Trailing off", hint: "Late cycle" },
  5: { label: "Trough", hint: "Just before the next shot" },
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Map elapsed-days + cycle-length to a stage 1-5 (descriptive only). */
function inferStage(daysSinceShot: number, cycleDays: number): 1 | 2 | 3 | 4 | 5 {
  if (daysSinceShot < 1) return 1;
  if (cycleDays <= 3) {
    // short ester — compress the 5 stages into the shorter window
    if (daysSinceShot < 1.5) return 2;
    if (daysSinceShot < 2) return 3;
    if (daysSinceShot < cycleDays * 0.85) return 4;
    return 5;
  }
  const f = daysSinceShot / cycleDays;
  if (f < 0.2) return 2;
  if (f < 0.6) return 3;
  if (f < 0.85) return 4;
  return 5;
}

export function TrtLens({ markers }: { markers: MarkerReading[] }) {
  const trt = useBaseline((s) => s.trt);
  const setTrt = useBaseline((s) => s.setTrt);
  const addEntry = useBaseline((s) => s.addTrtEntry);

  const [draft, setDraft] = useState<TrtLog>(
    trt ?? {
      compound: null,
      lastInjectionDate: null,
      cycleLengthDays: null,
      entries: [],
    },
  );
  const [newEntry, setNewEntry] = useState<Partial<TrtStageEntry>>({});

  function updateLog(patch: Partial<TrtLog>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setTrt(next);
  }

  function selectCompound(value: TrtCompound) {
    const def = COMPOUND_DEFAULTS.find((c) => c.value === value);
    updateLog({
      compound: value,
      cycleLengthDays: draft.cycleLengthDays ?? def?.defaultDays ?? 7,
    });
  }

  const elapsed = daysSince(draft.lastInjectionDate);
  const cycle = draft.cycleLengthDays ?? 7;
  const currentStage =
    elapsed !== null && cycle > 0 ? inferStage(elapsed, cycle) : null;
  const daysToNext =
    elapsed !== null && cycle > 0 ? Math.max(0, cycle - elapsed) : null;

  const relevant = useMemo(
    () =>
      markers.filter((m) =>
        ["hdl", "ldl", "hba1c", "fasting_glucose"].includes(m.markerId),
      ),
    [markers],
  );

  function logEntry() {
    if (!currentStage) return;
    const entry: TrtStageEntry = {
      stage: (newEntry.stage as 1 | 2 | 3 | 4 | 5) ?? currentStage,
      loggedAt: new Date().toISOString(),
      mood: newEntry.mood,
      energy: newEntry.energy,
      libido: newEntry.libido,
      notes: newEntry.notes,
    };
    addEntry(entry);
    setDraft((d) => ({ ...d, entries: [...d.entries, entry] }));
    setNewEntry({});
  }

  return (
    <div
      className="hi-card"
      style={{ padding: 24, position: "relative", overflow: "hidden" }}
    >
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
            <span className="hi-label">HRT / TRT cycle log</span>
            <div
              style={{
                fontFamily: tok.font,
                fontSize: 12,
                fontWeight: 600,
                color: tok.mute,
              }}
            >
              Tracking only — never prescribing
            </div>
          </div>
        </div>

        {/* protocol setup */}
        <div style={{ marginTop: 18 }}>
          <span className="hi-label" style={{ color: tok.ink2 }}>
            Your protocol
          </span>
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                fontFamily: tok.font,
                fontSize: 11,
                fontWeight: 700,
                color: tok.mute,
              }}
            >
              Compound
            </span>
            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 6,
                flexWrap: "wrap",
              }}
            >
              {COMPOUND_DEFAULTS.map((c) => {
                const active = draft.compound === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => selectCompound(c.value)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 99,
                      border: `1px solid ${active ? tok.ink : tok.sageSoft}`,
                      background: active ? tok.ink : tok.white,
                      color: active ? tok.white : tok.ink2,
                      fontFamily: tok.font,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-3"
            style={{ gap: 8, marginTop: 12 }}
          >
            <label>
              <span
                style={{
                  fontFamily: tok.font,
                  fontSize: 11,
                  fontWeight: 700,
                  color: tok.mute,
                }}
              >
                Last injection
              </span>
              <input
                type="date"
                value={draft.lastInjectionDate || ""}
                onChange={(e) =>
                  updateLog({ lastInjectionDate: e.target.value || null })
                }
                style={inputStyle}
              />
            </label>
            <label>
              <span
                style={{
                  fontFamily: tok.font,
                  fontSize: 11,
                  fontWeight: 700,
                  color: tok.mute,
                }}
              >
                Cycle length
              </span>
              <input
                inputMode="numeric"
                placeholder="days"
                value={draft.cycleLengthDays ? String(draft.cycleLengthDays) : ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                  updateLog({ cycleLengthDays: Number.isFinite(n) ? n : null });
                }}
                style={inputStyle}
              />
            </label>
            <label>
              <span
                style={{
                  fontFamily: tok.font,
                  fontSize: 11,
                  fontWeight: 700,
                  color: tok.mute,
                }}
              >
                Dose (your own label)
              </span>
              <input
                placeholder="e.g. 100mg"
                value={draft.doseLabel || ""}
                onChange={(e) => updateLog({ doseLabel: e.target.value })}
                style={inputStyle}
              />
            </label>
          </div>
        </div>

        {/* current stage */}
        {draft.lastInjectionDate && currentStage && (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 18,
              background: tok.ink,
              color: tok.white,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: 99,
                background: "rgba(202,0,19,.25)",
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
                  textTransform: "uppercase",
                }}
              >
                Currently · Stage {currentStage} of 5
              </div>
              <div
                style={{
                  fontFamily: tok.font,
                  fontSize: 18,
                  fontWeight: 900,
                  color: tok.white,
                  letterSpacing: "-0.01em",
                  marginTop: 2,
                }}
              >
                {STAGE_LABELS[currentStage].label}
              </div>
              <div
                style={{
                  fontFamily: tok.font,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255,255,255,.65)",
                  marginTop: 4,
                }}
              >
                Last shot {elapsed === 0 ? "today" : `${elapsed} day${elapsed === 1 ? "" : "s"} ago`}
                {daysToNext !== null && daysToNext > 0
                  ? ` · ${daysToNext} day${daysToNext === 1 ? "" : "s"} to next`
                  : daysToNext === 0
                    ? " · next shot due"
                    : ""}
              </div>

              {/* stage strip */}
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 4,
                }}
              >
                {[1, 2, 3, 4, 5].map((s) => {
                  const active = s === currentStage;
                  const passed = s < currentStage;
                  return (
                    <div
                      key={s}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 99,
                        background: active
                          ? tok.red
                          : passed
                            ? "rgba(255,255,255,.4)"
                            : "rgba(255,255,255,.12)",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* log this stage */}
        {draft.lastInjectionDate && currentStage && (
          <div style={{ marginTop: 18 }}>
            <span className="hi-label" style={{ color: tok.ink2 }}>
              Log this stage
            </span>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {(["mood", "energy", "libido"] as const).map((k) => (
                <ScalePicker
                  key={k}
                  label={k.charAt(0).toUpperCase() + k.slice(1)}
                  value={newEntry[k] as number | undefined}
                  onChange={(v) => setNewEntry((n) => ({ ...n, [k]: v }))}
                />
              ))}
            </div>
            <textarea
              placeholder="Notes — sleep, mood swings, sides, anything you want to remember…"
              value={newEntry.notes ?? ""}
              onChange={(e) =>
                setNewEntry((n) => ({ ...n, notes: e.target.value }))
              }
              rows={2}
              style={{
                ...inputStyle,
                width: "100%",
                marginTop: 10,
                resize: "vertical",
                fontFamily: tok.font,
                lineHeight: 1.5,
              }}
            />
            <button
              type="button"
              onClick={logEntry}
              style={{
                marginTop: 10,
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                background: tok.red,
                color: tok.white,
                fontFamily: tok.font,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: tok.shadowRed,
              }}
            >
              Save entry →
            </button>
          </div>
        )}

        {/* history */}
        {draft.entries.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <span className="hi-label" style={{ color: tok.ink2 }}>
              Recent entries
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 8,
              }}
            >
              {draft.entries
                .slice()
                .reverse()
                .slice(0, 4)
                .map((e, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: tok.paper,
                      border: `1px solid ${tok.sageSoft}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: tok.font,
                          fontSize: 12,
                          fontWeight: 800,
                          color: tok.ink,
                        }}
                      >
                        Stage {e.stage} · {STAGE_LABELS[e.stage].label}
                      </span>
                      <span
                        style={{
                          fontFamily: tok.font,
                          fontSize: 11,
                          fontWeight: 600,
                          color: tok.mute,
                        }}
                      >
                        {formatDate(e.loggedAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 6,
                        fontFamily: tok.font,
                        fontSize: 11,
                        fontWeight: 700,
                        color: tok.ink2,
                      }}
                    >
                      {e.mood !== undefined && <span>Mood {e.mood}/10</span>}
                      {e.energy !== undefined && <span>Energy {e.energy}/10</span>}
                      {e.libido !== undefined && <span>Libido {e.libido}/10</span>}
                    </div>
                    {e.notes && (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontFamily: tok.font,
                          fontSize: 12,
                          fontWeight: 500,
                          color: tok.ink2,
                          lineHeight: 1.45,
                        }}
                      >
                        {e.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* relevant markers */}
        {relevant.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <span className="hi-label" style={{ color: tok.ink2 }}>
              Worth watching alongside
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 8,
              }}
            >
              {relevant.map((m) => (
                <div
                  key={m.markerId}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: 12,
                    borderRadius: 16,
                    background: tok.paper,
                    border: `1px solid ${tok.sageSoft}`,
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
                      flex: "0 0 auto",
                    }}
                  >
                    {m.value}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: tok.font,
                        fontSize: 13,
                        fontWeight: 800,
                        color: tok.ink,
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      style={{
                        fontFamily: tok.font,
                        fontSize: 12,
                        fontWeight: 500,
                        color: tok.ink2,
                        lineHeight: 1.4,
                        marginTop: 2,
                      }}
                    >
                      {TRT_MARKER_CONTEXT[m.markerId]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* what TRT users typically add */}
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 14,
            background: tok.paper,
            border: `1px dashed ${tok.sage}80`,
            fontFamily: tok.font,
            fontSize: 11.5,
            fontWeight: 500,
            color: tok.ink2,
            lineHeight: 1.5,
          }}
        >
          Many people on a protocol add Total + Free Testosterone, Estradiol,
          SHBG, and Hematocrit to their bloodwork rota. Add them on your next
          report and we&apos;ll surface those too.
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
          <span
            style={{
              fontFamily: tok.font,
              fontSize: 11.5,
              fontWeight: 500,
              color: tok.ink2,
              lineHeight: 1.45,
            }}
          >
            Baseline is a logbook for someone already on a prescribed protocol.
            Doses, frequency, and compounds are your clinician&apos;s call — we
            never recommend any of that.
          </span>
        </div>
      </div>
    </div>
  );
}

function ScalePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ flex: "1 1 180px", minWidth: 180 }}>
      <div
        style={{
          fontFamily: tok.font,
          fontSize: 11,
          fontWeight: 700,
          color: tok.mute,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                border: `1px solid ${active ? tok.ink : tok.sageSoft}`,
                background: active ? tok.ink : tok.white,
                color: active ? tok.white : tok.ink2,
                fontFamily: tok.font,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {n}
            </button>
          );
        })}
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
