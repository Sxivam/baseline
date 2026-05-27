// Feeling-first labels for clinical markers. The PRD framing is "lead with
// the felt effect first, the clinical name second" — plain English first,
// jargon second. Use these wherever a marker is named in user-facing copy.
//
// Pattern produced by feelingWithName(): "the low-mood one (Vitamin D)"

export const FEELING_LABELS: Record<string, string> = {
  vitamin_d: "the low-mood / low-energy one",
  vitamin_b12: "the brain-fog one",
  ferritin: "the breathless-on-stairs one",
  ldl: "the long-game heart one",
  hdl: "the long-game heart one",
  hba1c: "the energy-crash one",
  fasting_glucose: "the energy-crash one",
  tsh: "the always-tired one",
};

/** Just the felt-effect phrase, or null if we don't have one. */
export function feelingLabel(markerId: string): string | null {
  return FEELING_LABELS[markerId] ?? null;
}

/** "the low-mood one (Vitamin D)" — feeling first, clinical name in parens. */
export function feelingWithName(markerId: string, clinicalName: string): string {
  const feeling = feelingLabel(markerId);
  if (!feeling) return clinicalName;
  return `${feeling} (${clinicalName})`;
}
