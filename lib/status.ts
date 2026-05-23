// Status computation — the in / watch / low rule (prompts.md rule 4).
// "low" means "needs attention" — for LDL / HbA1c / fasting glucose that's a
// value too HIGH; for the rest it's a value too LOW.

import { MARKERS, thresholdsFor } from "./markers";
import type { MarkerStatus, Sex } from "./types";

const WATCH_FRACTION = 0.1; // within 10% of the nearest threshold

export function computeStatus(markerId: string, value: number, sex: Sex): MarkerStatus {
  const def = MARKERS[markerId];
  if (!def) return "in";
  const t = thresholdsFor(def, sex);

  // Out of range either side → needs attention.
  if (value < t.low || value > t.high) return "low";

  // In range — flag "watch" when close to a threshold.
  const lowBand = Math.abs(t.low) * WATCH_FRACTION;
  const highBand = Math.abs(t.high) * WATCH_FRACTION;
  if (lowBand > 0 && value <= t.low + lowBand) return "watch";
  if (highBand > 0 && Number.isFinite(t.high) && value >= t.high - highBand) return "watch";
  return "in";
}

/** For a marker outside range, which side it fell on (drives hero copy). */
export function statusSide(markerId: string, value: number, sex: Sex): "below" | "above" | null {
  const def = MARKERS[markerId];
  if (!def) return null;
  const t = thresholdsFor(def, sex);
  if (value < t.low) return "below";
  if (value > t.high) return "above";
  return null;
}
