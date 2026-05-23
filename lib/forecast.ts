// Decay forecast heuristic — ported from handoff/forecast.md.
// A defensible, transparent projection — not clinical modelling. Always copy
// the trajectory as "likely" / "we'd expect", never definitive.

import { MARKERS } from "./markers";
import type { Forecast, ForecastPoint, Profile } from "./types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Project a marker forward month by month:
 *   value(n) = value(n-1) + baseline + diet + sun + season[month]
 */
export function projectMarker(
  markerId: string,
  currentValue: number,
  currentDate: Date,
  profile: Profile,
  monthsAhead = 6,
): ForecastPoint[] {
  const def = MARKERS[markerId];
  const decay = def?.decay;
  if (!def?.thresholds || !decay) return [];
  const threshold = def.thresholds.low;
  const dietMod = decay.modifiers[`diet.${profile.diet}`] ?? 0;
  const sunMod = decay.modifiers[`sun.${profile.sun}`] ?? 0;

  const points: ForecastPoint[] = [];
  let value = currentValue;
  const date = new Date(currentDate);
  points.push({ date: date.toISOString(), value, belowThreshold: value < threshold });

  for (let i = 1; i <= monthsAhead; i++) {
    date.setMonth(date.getMonth() + 1);
    const seasonMod = decay.seasonFactor?.[MONTHS[date.getMonth()]] ?? 0;
    value = value + decay.baselinePerMonth + dietMod + sunMod + seasonMod;
    points.push({ date: new Date(date).toISOString(), value, belowThreshold: value < threshold });
  }
  return points;
}

/** First date the projection dips under the threshold, linearly interpolated. */
export function findCrossing(points: ForecastPoint[], threshold: number): string | null {
  const idx = points.findIndex((p) => p.belowThreshold);
  if (idx <= 0) return null; // already below (0), or never crosses (-1)
  const prev = points[idx - 1];
  const next = points[idx];
  const t = (threshold - prev.value) / (next.value - prev.value);
  const prevMs = new Date(prev.date).getTime();
  const nextMs = new Date(next.date).getTime();
  return new Date(prevMs + t * (nextMs - prevMs)).toISOString();
}

/** Nudge fires 3 weeks (21 days) before the projected crossing. */
export function nudgeFromCrossing(crossingISO: string): string {
  const d = new Date(crossingISO);
  d.setDate(d.getDate() - 21);
  return d.toISOString();
}

/**
 * Build a full forecast for a marker, handling all edge cases from
 * forecast.md: already-below, never-crosses, negative clamp.
 */
export function buildForecast(
  markerId: string,
  value: number,
  testDate: Date,
  profile: Profile,
): Forecast {
  const def = MARKERS[markerId];
  const threshold = def?.thresholds?.low ?? 0;
  const points = projectMarker(markerId, value, testDate, profile, 6);
  const alreadyBelow = value < threshold;

  let crossingDate: string | null = null;
  let neverCrosses = false;
  if (!alreadyBelow) {
    crossingDate = findCrossing(points, threshold);
    if (!crossingDate) neverCrosses = true;
  }

  let nudgeDate: string | null = null;
  if (alreadyBelow) {
    // schedule the nudge for tomorrow
    const d = new Date();
    d.setDate(d.getDate() + 1);
    nudgeDate = d.toISOString();
  } else if (crossingDate) {
    nudgeDate = nudgeFromCrossing(crossingDate);
  } else {
    // never crosses in-window — periodic check-in nudge at 4 months
    const d = new Date(testDate);
    d.setMonth(d.getMonth() + 4);
    nudgeDate = d.toISOString();
  }

  // Clamp negatives at 0 for display (the formula can over-shoot).
  const displayPoints = points.map((p) => ({ ...p, value: Math.max(0, p.value) }));

  return { markerId, points: displayPoints, crossingDate, nudgeDate, alreadyBelow, neverCrosses };
}
