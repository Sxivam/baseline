// Status computation — the in / watch / low rule (prompts.md rule 4).
// "low" means "needs attention" — for LDL / HbA1c / fasting glucose that's a
// value too HIGH; for the rest it's a value too LOW.

import { MARKERS, INVERTED_HIGH, thresholdsFor } from "./markers";
import type { MarkerStatus, Sex } from "./types";

/** Severity scale separate from in/watch/low — flags readings that warrant
 *  a clinician conversation, not just lifestyle work. §7-safe: this is
 *  awareness of how far the value sits from the typical range, never a
 *  diagnosis. "severe" cutoffs are intentionally conservative. */
export type MarkerSeverity = "ok" | "concern" | "severe";

const FEMALE_FERRITIN_SEVERE = 10;
const MALE_FERRITIN_SEVERE = 20;

export function severityFor(
  markerId: string,
  value: number,
  sex: Sex,
): MarkerSeverity {
  const def = MARKERS[markerId];
  if (!def) return "ok";
  const t = thresholdsFor(def, sex);

  // Inverted markers: HIGH values are the worry (LDL, HbA1c, fasting glucose).
  if (INVERTED_HIGH.has(markerId)) {
    if (markerId === "ldl" && value >= 160) return "severe";
    if (markerId === "hba1c" && value >= 6.5) return "severe";
    if (markerId === "fasting_glucose" && value >= 126) return "severe";
    return value > t.high ? "concern" : "ok";
  }

  // Standard markers: LOW (or extreme high) values are the worry.
  if (markerId === "vitamin_d" && value < 20) return "severe";
  if (markerId === "vitamin_b12" && value < 200) return "severe";
  if (markerId === "ferritin") {
    const cutoff =
      sex === "female" ? FEMALE_FERRITIN_SEVERE : MALE_FERRITIN_SEVERE;
    if (value < cutoff) return "severe";
  }
  if (markerId === "hdl" && value < 30) return "severe";
  if (markerId === "tsh" && (value < 0.1 || value > 10)) return "severe";

  if (value < t.low || value > t.high) return "concern";
  return "ok";
}

/** Marker-specific framing for the doctor callout. Keeps the copy honest
 *  (names the specific value), warm (no urgency words), and §7-safe
 *  (alongside lifestyle work, never instead of). */
export function doctorCalloutCopy(
  markerId: string,
  value: number,
  unit: string,
): string {
  const def = MARKERS[markerId];
  const name = def?.name ?? "this marker";
  if (markerId === "vitamin_d") {
    return `Your ${name} at ${value} ${unit} sits well below the commonly-cited sufficiency line. Worth a short doctor conversation alongside the lifestyle plan — they can take a fuller picture than one reading shows.`;
  }
  if (markerId === "vitamin_b12") {
    return `B12 at ${value} ${unit} is low enough that it's worth a doctor's eyes alongside the dietary moves. A GP can rule out absorption issues that food alone won't fix.`;
  }
  if (markerId === "ferritin") {
    return `Ferritin at ${value} ${unit} reads quite low — iron stores this thin are worth a doctor's read alongside the food work. They'll look at the cause, not just the number.`;
  }
  if (markerId === "ldl") {
    return `LDL at ${value} ${unit} is meaningfully above the typical range. A short conversation with a doctor alongside the lifestyle plan will tell you whether the situation needs more than habits.`;
  }
  if (markerId === "hdl") {
    return `HDL at ${value} ${unit} is on the very low side of the protective range. Worth a doctor's eyes alongside the cardio work.`;
  }
  if (markerId === "hba1c") {
    return `HbA1c at ${value}% is in the range a doctor would want to look at directly. The lifestyle moves stay relevant; the conversation just shouldn't wait.`;
  }
  if (markerId === "fasting_glucose") {
    return `Fasting glucose at ${value} ${unit} is high enough that a clinician should weigh in alongside the lifestyle plan.`;
  }
  if (markerId === "tsh") {
    return `TSH at ${value} ${unit} sits well outside the typical range. This is a "doctor first" conversation; lifestyle helps, but the diagnosis needs a clinician.`;
  }
  return `${name} at ${value} ${unit} is far enough off the typical range that a doctor should weigh in alongside the lifestyle plan.`;
}

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
