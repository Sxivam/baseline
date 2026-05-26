"use client";

// Upload — PDF parse (via /api/parse) or manual entry. Manual fallback is
// always one click away; a parse failure routes here too.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { MARKERS } from "@/lib/markers";
import { computeStatus } from "@/lib/status";
import { DEMO_RAW } from "@/lib/demo";
import type { MarkerReading } from "@/lib/types";
import { Blob, Button, Disclaimer, Icon, Wordmark } from "@/components/ui";

const MANUAL_MARKERS = ["vitamin_d", "vitamin_b12", "ferritin", "ldl", "hdl", "hba1c"];
const LAB_PILLS = ["PharmEasy", "1mg", "Thyrocare", "Apollo", "Redcliffe", "+more"];
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function UploadPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const setParse = useBaseline((s) => s.setParse);

  const [tab, setTab] = useState<"upload" | "manual">("upload");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [testDate, setTestDate] = useState(todayISO());
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (hydrated && !profile) router.replace("/start");
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) {
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

  function finalize(
    markers: Omit<MarkerReading, "status">[],
    date: string,
    labName: string,
    parseConfidence: "high" | "medium" | "low",
  ) {
    const finalMarkers: MarkerReading[] = markers.map((m) => ({
      ...m,
      status: computeStatus(m.markerId, m.value, profile!.sex),
    }));
    setParse({ markers: finalMarkers, testDate: date, labName, parseConfidence });
    // First time through, route to the intake → plan reveal. Returning
    // users who already accepted a plan skip straight to the dashboard.
    const { intake, plan } = useBaseline.getState();
    if (intake && plan?.startedAt) router.push("/dashboard");
    else router.push("/intake");
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.markers) || data.markers.length === 0) {
        throw new Error(data.error || "parse_failed");
      }
      finalize(
        data.markers,
        data.testDate || todayISO(),
        data.labName || "Uploaded report",
        data.parseConfidence || "medium",
      );
    } catch {
      setParsing(false);
      setParseError("That didn't parse cleanly — type the numbers in instead?");
      setTab("manual");
    }
  }

  function saveManual() {
    const markers = MANUAL_MARKERS.filter(
      (id) => values[id] && !Number.isNaN(Number(values[id])),
    ).map((id) => ({
      markerId: id,
      name: MARKERS[id].fullName,
      value: Number(values[id]),
      unit: MARKERS[id].unit,
      confidence: 1,
    }));
    if (markers.length === 0) return;
    finalize(markers, testDate, "Manual entry", "high");
  }

  function fillSample() {
    const v: Record<string, string> = {};
    DEMO_RAW.forEach((m) => {
      v[m.markerId] = String(m.value);
    });
    setValues(v);
    setTestDate("2026-05-03");
  }

  const manualCount = MANUAL_MARKERS.filter((id) => values[id]).length;

  return (
    <main style={{ minHeight: "100vh", background: tok.paper, position: "relative", overflow: "hidden" }}>
      <Blob size={360} top={-150} right={-110} color={tok.sageMid} blur={20} />
      <Blob size={220} bottom={-90} left={-70} color={tok.redSoft} blur={20} />

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1120,
          margin: "0 auto",
          padding: "24px 22px 48px",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Wordmark size={20} />
          <span className="hi-label">Step 2 of 3</span>
        </div>

        <div style={{ marginTop: 26 }}>
          <h1
            style={{
              fontFamily: tok.font,
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Your bloodwork.
          </h1>
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 15,
              fontWeight: 500,
              color: tok.ink2,
              margin: "8px 0 0",
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            Upload the PDF or type the numbers — whichever&apos;s easier. The manual
            fallback is always there.
          </p>
        </div>

        {parseError && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 16,
              background: tok.redSoft,
              border: `1px solid ${tok.red}40`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon name="info" size={15} stroke={tok.red} strokeWidth={2.2} />
            <span style={{ fontFamily: tok.font, fontSize: 13, fontWeight: 700, color: tok.red }}>
              {parseError}
            </span>
          </div>
        )}

        {/* tabs — mobile only */}
        <div
          className="flex lg:hidden"
          style={{
            gap: 6,
            marginTop: 18,
            padding: 4,
            borderRadius: 99,
            background: "rgba(255,255,255,.6)",
            border: `1px solid ${tok.sageSoft}`,
          }}
        >
          {(["upload", "manual"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 99,
                border: "none",
                background: tab === t ? tok.ink : "transparent",
                color: tab === t ? tok.white : tok.ink,
                fontFamily: tok.font,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* panels */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2"
          style={{ gap: 18, marginTop: 18 }}
        >
          {/* upload panel */}
          <div className={tab === "upload" ? "" : "hidden lg:block"}>
            <div
              style={{
                background: tok.white,
                borderRadius: 32,
                border: `1px solid ${tok.sageSoft}`,
                boxShadow: tok.shadow,
                padding: 26,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <span className="hi-label">Upload a PDF</span>
                  <h3 style={{ fontFamily: tok.font, fontSize: 20, fontWeight: 900, margin: "4px 0 0" }}>
                    Drop your report.
                  </h3>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 99,
                    background: tok.ink,
                    color: tok.white,
                  }}
                >
                  <Icon name="spark" size={12} stroke={tok.white} strokeWidth={2.5} />
                  <span style={{ fontFamily: tok.font, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em" }}>
                    PARSED IN SECONDS
                  </span>
                </div>
              </div>

              {parsing ? (
                <ParsingState />
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                  style={{
                    flex: 1,
                    minHeight: 240,
                    border: `2px dashed ${dragging ? tok.red : tok.sage}`,
                    borderRadius: 26,
                    background: dragging ? tok.redSoft : "rgba(255,255,255,.5)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 14,
                    padding: 24,
                    cursor: "pointer",
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 20,
                      background: tok.white,
                      border: `1px solid ${tok.sageSoft}`,
                      boxShadow: tok.shadowSm,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    <Icon name="upload" size={26} stroke={tok.ink} strokeWidth={1.8} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: tok.font, fontSize: 16, fontWeight: 800 }}>
                      Drop your report here
                    </div>
                    <div style={{ fontFamily: tok.font, fontSize: 12, fontWeight: 500, color: tok.mute, marginTop: 4 }}>
                      or tap to choose · pdf, jpg, png up to 10mb
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: 99,
                      background: tok.redSoft,
                      border: `1px solid ${tok.red}40`,
                    }}
                  >
                    <Icon name="spark" size={12} stroke={tok.red} strokeWidth={2.5} />
                    <span
                      style={{
                        fontFamily: tok.font,
                        fontSize: 11,
                        fontWeight: 800,
                        color: tok.red,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Parsed in seconds
                    </span>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <span className="hi-label" style={{ display: "block", marginBottom: 8 }}>
                  We read these lab formats
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {LAB_PILLS.map((l) => (
                    <span
                      key={l}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 99,
                        background: tok.white,
                        border: `1px solid ${tok.sageSoft}`,
                        fontFamily: tok.font,
                        fontSize: 12,
                        fontWeight: 700,
                        color: tok.ink2,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: tok.sage }} />
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: tok.sageSoft,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Icon name="lock" size={14} stroke={tok.ink2} strokeWidth={1.8} />
                <span style={{ fontFamily: tok.font, fontSize: 11.5, color: tok.ink2, lineHeight: 1.4 }}>
                  Your report stays on your device. We extract the numbers and
                  discard the file.
                </span>
              </div>
            </div>
          </div>

          {/* manual panel */}
          <div className={tab === "manual" ? "" : "hidden lg:block"}>
            <div
              style={{
                background: tok.white,
                borderRadius: 32,
                border: `1px solid ${tok.sageSoft}`,
                boxShadow: tok.shadow,
                padding: 26,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <span className="hi-label">Or type it in</span>
                  <h3 style={{ fontFamily: tok.font, fontSize: 20, fontWeight: 900, margin: "4px 0 0" }}>
                    Just the numbers.
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={fillSample}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontFamily: tok.font,
                    fontSize: 11,
                    fontWeight: 800,
                    color: tok.red,
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Use sample
                </button>
              </div>

              <label style={{ display: "block", marginBottom: 12 }}>
                <span className="hi-label" style={{ display: "block", marginBottom: 6 }}>
                  Test date
                </span>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: `1px solid ${tok.sageSoft}`,
                    background: tok.paper,
                    fontFamily: tok.font,
                    fontSize: 14,
                    fontWeight: 700,
                    color: tok.ink,
                  }}
                />
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {MANUAL_MARKERS.map((id) => {
                  const m = MARKERS[id];
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 14,
                        background: tok.white,
                        border: `1px solid ${tok.sageSoft}`,
                      }}
                    >
                      <span style={{ flex: 1, fontFamily: tok.font, fontSize: 13, fontWeight: 700, minWidth: 0 }}>
                        {m.fullName}
                      </span>
                      <input
                        value={values[id] || ""}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [id]: e.target.value.replace(/[^0-9.]/g, "") }))
                        }
                        placeholder="—"
                        inputMode="decimal"
                        style={{
                          width: 72,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${tok.sageSoft}`,
                          background: tok.paper,
                          fontFamily: tok.font,
                          fontSize: 14,
                          fontWeight: 800,
                          color: tok.ink,
                          textAlign: "right",
                        }}
                      />
                      <span style={{ width: 52, fontFamily: tok.font, fontSize: 11, fontWeight: 700, color: tok.mute }}>
                        {m.unit}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={saveManual}
                disabled={manualCount === 0}
                style={{ width: "100%", marginTop: 16 }}
              >
                Save &amp; continue
                <Icon name="arrow" size={16} stroke={tok.white} strokeWidth={2.5} />
              </Button>
            </div>
          </div>
        </div>

        <Disclaimer style={{ marginTop: 18, maxWidth: 560 }} />
      </div>
    </main>
  );
}

function ParsingState() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        border: `2px dashed ${tok.sage}`,
        borderRadius: 26,
        background: "rgba(255,255,255,.5)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 99,
          border: `3px solid ${tok.sageMid}`,
          borderTopColor: tok.red,
          animation: "bl-spin 0.8s linear infinite",
        }}
      />
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontFamily: tok.font, fontSize: 15, fontWeight: 800 }}>
          Reading your report…
        </div>
        <div
          style={{
            fontFamily: tok.font,
            fontSize: 12,
            fontWeight: 500,
            color: tok.mute,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          Parsing with AI — extracts markers from the PDF, matches each against
          its canonical reference range, and returns structured JSON. Typical
          time: 5-12 seconds.
        </div>
      </div>
      <div
        style={{
          width: "70%",
          maxWidth: 240,
          height: 5,
          borderRadius: 99,
          background: tok.sageSoft,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            width: "40%",
            height: "100%",
            borderRadius: 99,
            background: tok.red,
            animation: "bl-progress 1.1s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}
