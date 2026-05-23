"use client";

// Data-driven decay forecast chart. The observed (charcoal) curve runs from the
// test date to today; the projected (red dashed) curve continues 6 months out
// through the sufficiency threshold. All positions computed from the forecast
// points — no hardcoded geometry.

import type { CSSProperties, ReactNode } from "react";
import { tok } from "@/lib/tokens";
import { softDate, shortMonth } from "@/lib/format";
import type { Forecast } from "@/lib/types";

const annotStyle: CSSProperties = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 8,
  fontFamily: tok.font,
  fontSize: 11,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

function Annot({
  x,
  y,
  placement,
  children,
}: {
  x: number;
  y: number;
  placement: "above" | "below";
  children: ReactNode;
}) {
  const translateX = x > 72 ? "-100%" : x < 28 ? "0%" : "-50%";
  const translateY = placement === "above" ? "calc(-100% - 12px)" : "12px";
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(${translateX}, ${translateY})`,
        pointerEvents: "none",
        zIndex: 2,
      }}
    >
      {children}
    </div>
  );
}

function Dot({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: 11,
        height: 11,
        borderRadius: 99,
        background: color,
        border: `2px solid ${tok.white}`,
        transform: "translate(-50%, -50%)",
        boxShadow: tok.shadowSm,
        zIndex: 1,
      }}
    />
  );
}

export function ForecastChart({
  forecast,
  threshold,
  unit,
  compact = false,
}: {
  forecast: Forecast;
  threshold: number;
  unit?: string;
  compact?: boolean;
}) {
  const pts = forecast.points;
  const height = compact ? 128 : 232;
  if (pts.length < 2) return <div style={{ height }} />;

  const ms = (d: string) => new Date(d).getTime();
  const t0 = ms(pts[0].date);
  const tN = ms(pts[pts.length - 1].date);
  const span = tN - t0 || 1;

  const values = pts.map((p) => p.value);
  let lo = Math.min(...values, threshold);
  let hi = Math.max(...values, threshold);
  const pad = (hi - lo) * 0.22 || 6;
  lo -= pad;
  hi += pad;
  const range = hi - lo || 1;

  const xFor = (m: number) => ((m - t0) / span) * 100;
  const yFor = (v: number) => 100 - ((v - lo) / range) * 100;

  const xy = pts.map((p) => ({
    m: ms(p.date),
    x: xFor(ms(p.date)),
    y: yFor(p.value),
    v: p.value,
  }));

  const valueAt = (m: number): number => {
    if (m <= xy[0].m) return xy[0].v;
    for (let i = 1; i < xy.length; i++) {
      if (m <= xy[i].m) {
        const a = xy[i - 1];
        const b = xy[i];
        const f = (m - a.m) / (b.m - a.m || 1);
        return a.v + f * (b.v - a.v);
      }
    }
    return xy[xy.length - 1].v;
  };

  const nowM = Math.min(Math.max(Date.now(), t0), tN);
  const nowPt = { x: xFor(nowM), y: yFor(valueAt(nowM)), v: valueAt(nowM) };

  const observed = [...xy.filter((p) => p.m <= nowM), nowPt].sort((a, b) => a.x - b.x);
  const projected = [nowPt, ...xy.filter((p) => p.m > nowM)].sort((a, b) => a.x - b.x);

  const polyline = (arr: { x: number; y: number }[]) =>
    arr.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const areaPath = (arr: { x: number; y: number }[]) =>
    `${polyline(arr)} L${arr[arr.length - 1].x.toFixed(2)},100 L${arr[0].x.toFixed(2)},100 Z`;

  const thY = yFor(threshold);
  const crossing = forecast.crossingDate
    ? { x: xFor(ms(forecast.crossingDate)), y: thY }
    : null;
  const nudgeM = forecast.nudgeDate ? ms(forecast.nudgeDate) : null;
  const nudge =
    nudgeM !== null && nudgeM >= t0 && nudgeM <= tN
      ? { x: xFor(nudgeM), y: yFor(valueAt(nudgeM)) }
      : null;
  const showNudge =
    !compact && nudge && !forecast.alreadyBelow && !forecast.neverCrosses;

  // x-axis month labels at points 0, 2, 4, 6
  const labelIdx = [0, 2, 4, 6].filter((i) => i < pts.length);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", height }}>
        {/* threshold line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${thY}%`,
            borderTop: `1.5px dashed ${tok.red}`,
          }}
        />
        {!compact && (
          <span
            style={{
              position: "absolute",
              right: 0,
              top: `calc(${thY}% - 17px)`,
              fontFamily: tok.font,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: tok.red,
            }}
          >
            SUFFICIENCY · {threshold}
            {unit ? ` ${unit}` : ""}
          </span>
        )}

        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="fc-obs" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={tok.sage} stopOpacity="0.35" />
              <stop offset="100%" stopColor={tok.sage} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fc-proj" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={tok.red} stopOpacity="0.16" />
              <stop offset="100%" stopColor={tok.red} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath(observed)} fill="url(#fc-obs)" />
          <path d={areaPath(projected)} fill="url(#fc-proj)" />
          <path
            d={polyline(observed)}
            fill="none"
            stroke={tok.ink}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={polyline(projected)}
            fill="none"
            stroke={tok.red}
            strokeWidth="2.5"
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <Dot x={xy[0].x} y={xy[0].y} color={tok.ink} />
        {crossing && <Dot x={crossing.x} y={crossing.y} color={tok.red} />}

        {!compact && (
          <>
            <Annot x={nowPt.x} y={nowPt.y} placement="above">
              <span style={{ ...annotStyle, background: tok.ink, color: tok.white }}>
                Now · {Math.round(nowPt.v)}
              </span>
            </Annot>
            {showNudge && nudge && forecast.nudgeDate && (
              <Annot x={nudge.x} y={nudge.y} placement="above">
                <span
                  style={{
                    ...annotStyle,
                    background: tok.white,
                    color: tok.ink,
                    border: `1px solid ${tok.sageSoft}`,
                    boxShadow: tok.shadowSm,
                  }}
                >
                  {softDate(forecast.nudgeDate)} · nudge
                </span>
              </Annot>
            )}
            {crossing && forecast.crossingDate && (
              <Annot x={crossing.x} y={crossing.y} placement="below">
                <span style={{ ...annotStyle, background: tok.red, color: tok.white }}>
                  {softDate(forecast.crossingDate)} · crosses {threshold}
                </span>
              </Annot>
            )}
          </>
        )}
      </div>

      {/* x-axis */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        {labelIdx.map((i) => (
          <span
            key={i}
            style={{
              fontFamily: tok.font,
              fontSize: compact ? 9 : 11,
              fontWeight: 700,
              color: tok.mute,
            }}
          >
            {shortMonth(pts[i].date)}
          </span>
        ))}
      </div>
    </div>
  );
}
