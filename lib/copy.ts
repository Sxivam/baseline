// Static, §7-pre-approved copy — ported from handoff/copy.md.
// LLM-generated copy is checked separately; these strings are the safe
// fallbacks and the fixed UI strings.

import type { MarkerStatus } from "./types";

export const DISCLAIMER_FULL =
  "Baseline is an awareness and tracking tool, not a medical service. Always consult a qualified doctor for diagnosis or treatment.";
export const DISCLAIMER_SHORT = "Awareness only — not medical advice.";
export const DISCLAIMER_EMAIL = "Baseline · tracking, not diagnosis.";

/** Per-marker hint shown beneath the value. Keyed by status; for LDL / HbA1c /
 *  fasting glucose, "low" status means the value is too HIGH. */
export const MARKER_HINTS: Record<string, Record<MarkerStatus, string>> = {
  vitamin_d: {
    low: "Drops in low-sun months. You said indoors, mostly. Worth getting sun and looking at dietary sources.",
    watch: "Just above the line. D drops in low-sun months — keep an eye on it.",
    in: "Comfortably above the sufficiency threshold.",
  },
  vitamin_b12: {
    low: "B12 drifts on plant-heavy diets over months. Worth looking at dietary sources.",
    watch: "On the lower end of the range — vegetarians especially trend this way.",
    in: "In range — comfortable B12 stores.",
  },
  ferritin: {
    low: "Iron stores low. Worth looking at iron-rich foods (and vitamin C with them).",
    watch: "Lower end of the range — iron stores worth keeping an eye on.",
    in: "Iron stores look healthy.",
  },
  ldl: {
    low: "Above the optimal cutoff. Saturated fat and cardio frequency are the usual levers.",
    watch: "Just above optimal.",
    in: "LDL within the optimal range.",
  },
  hdl: {
    low: "Below the protective range. Cardio and healthy fats are the usual levers.",
    watch: "On the lower end.",
    in: "Protective range — healthy HDL.",
  },
  hba1c: {
    low: "Above the normal cutoff. Worth looking at carb quality and meal timing.",
    watch: "Approaching the upper end of normal.",
    in: "3-month average blood sugar is in the normal range.",
  },
  fasting_glucose: {
    low: "Above the normal cutoff. Worth looking at carb quality and meal timing.",
    watch: "Approaching the upper end of normal.",
    in: "Fasting blood sugar is in the normal range.",
  },
  tsh: {
    low: "Outside the typical range — worth a conversation with a doctor.",
    watch: "Near the edge of the typical range — worth keeping an eye on.",
    in: "Thyroid signalling looks normal.",
  },
};

export function markerHint(markerId: string, status: MarkerStatus): string {
  return MARKER_HINTS[markerId]?.[status] ?? "";
}

/** "Three small things" fallback copy for the nudge email (behavioural only). */
export const THREE_THINGS: Record<string, { emoji: string; text: string }[]> = {
  vitamin_d: [
    { emoji: "☀", text: "15–20 min of mid-morning sun, arms out." },
    { emoji: "🍳", text: "Eggs + fortified milk if you eat them." },
    { emoji: "🧪", text: "Re-test in ~4 weeks (₹300 · PharmEasy / 1mg)." },
  ],
  vitamin_b12: [
    { emoji: "🥚", text: "Eggs + dairy daily if you eat them." },
    { emoji: "🌾", text: "Look at fortified cereals / nutritional yeast." },
    { emoji: "🧪", text: "Re-test in ~6 weeks." },
  ],
};

export const ERRORS = {
  parseFailed: "That didn't parse cleanly. Want to type the numbers in instead?",
  parseLowConfidence: "We got most of it — please double-check before continuing.",
  dashboardEmpty: "Drop a report to see your baseline.",
  forecastUnavailable: "We forecast Vitamin D and B12 in v1. More markers soon.",
  networkError: "Couldn't reach Baseline. Try again?",
};
