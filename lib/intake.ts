// Adaptive intake — defines every question Baseline can ask, plus the rules
// that pick which subset is shown to a specific user. Drives /intake. The
// answers feed into the plan generator (lib/plan.ts).

import { computeStatus } from "./status";
import type { IntakeAnswers, MarkerReading, Profile } from "./types";

export type AnswerKey = keyof IntakeAnswers;

export type QuestionKind =
  | "scale" // 1..N pill row (e.g. 1-10)
  | "number" // freeform number
  | "single" // one of pills
  | "multi"; // multiple of pills

export interface Choice {
  value: string;
  label: string;
}

export interface IntakeQuestion {
  key: AnswerKey;
  prompt: string;
  hint?: string;
  kind: QuestionKind;
  /** For "scale" / "number" — min/max/unit */
  min?: number;
  max?: number;
  unit?: string;
  /** For "single" / "multi". */
  choices?: Choice[];
}

// ─── Catalogue of every question we know how to ask ─────────────────────────
const Q: Record<string, IntakeQuestion> = {
  sleep_hours: {
    key: "sleep_hours",
    prompt: "How many hours do you usually sleep?",
    hint: "On a typical weekday.",
    kind: "scale",
    min: 4,
    max: 10,
    unit: "hrs",
  },
  stress_level: {
    key: "stress_level",
    prompt: "How would you rate your stress lately?",
    hint: "1 = calm · 10 = burning out",
    kind: "scale",
    min: 1,
    max: 10,
  },
  exercise_days: {
    key: "exercise_days",
    prompt: "Days of exercise in a typical week?",
    hint: "Any movement that gets you breathing hard — walk, gym, sport.",
    kind: "scale",
    min: 0,
    max: 7,
    unit: "d",
  },
  morning_sun_freq: {
    key: "morning_sun_freq",
    prompt: "How often do you get morning sun?",
    hint: "Outside or on a balcony, before ~10 AM.",
    kind: "single",
    choices: [
      { value: "rarely", label: "Rarely" },
      { value: "sometimes", label: "A few times a week" },
      { value: "often", label: "Almost daily" },
    ],
  },
  b12_sources: {
    key: "b12_sources",
    prompt: "Which of these do you eat at least a few times a week?",
    kind: "multi",
    choices: [
      { value: "eggs", label: "Eggs" },
      { value: "dairy", label: "Dairy" },
      { value: "fish", label: "Fish / meat" },
      { value: "fortified", label: "Fortified cereal / milk" },
      { value: "none", label: "None of these" },
    ],
  },
  iron_pairing: {
    key: "iron_pairing",
    prompt: "When you eat iron-rich foods, do you pair with vitamin C?",
    hint: "Lemon, amla, citrus, tomatoes — boost iron absorption ~3×.",
    kind: "single",
    choices: [
      { value: "always", label: "Usually" },
      { value: "sometimes", label: "Sometimes" },
      { value: "never", label: "Never thought about it" },
    ],
  },
  chai_with_meals: {
    key: "chai_with_meals",
    prompt: "Do you drink chai or coffee with meals?",
    hint: "Tannins block iron absorption when paired with food.",
    kind: "single",
    choices: [
      { value: "yes", label: "Most days" },
      { value: "no", label: "Not really" },
    ],
  },
  cooking_fat: {
    key: "cooking_fat",
    prompt: "Your default cooking fat at home?",
    kind: "single",
    choices: [
      { value: "ghee", label: "Ghee / butter" },
      { value: "refined", label: "Refined oil" },
      { value: "olive", label: "Olive / cold-pressed" },
      { value: "mixed", label: "Mix of all" },
    ],
  },
  refined_carbs: {
    key: "refined_carbs",
    prompt: "How often do refined carbs show up? (white rice, maida, sugar)",
    kind: "single",
    choices: [
      { value: "daily", label: "Daily" },
      { value: "few-week", label: "A few times a week" },
      { value: "rarely", label: "Rarely" },
    ],
  },
  walk_after_meals: {
    key: "walk_after_meals",
    prompt: "Do you walk after meals?",
    hint: "Even 10 minutes flattens blood-sugar spikes.",
    kind: "single",
    choices: [
      { value: "always", label: "Most meals" },
      { value: "sometimes", label: "Sometimes" },
      { value: "never", label: "Almost never" },
    ],
  },
  cycle_regular: {
    key: "cycle_regular",
    prompt: "Are your cycles fairly regular lately?",
    hint: "PCOS opt-in — we use this for the lifestyle lens, not diagnosis.",
    kind: "single",
    choices: [
      { value: "yes", label: "Yes, regular" },
      { value: "no", label: "Irregular" },
      { value: "not-sure", label: "Not sure" },
    ],
  },
  trt_logging: {
    key: "trt_logging",
    prompt: "How often do you currently log how you feel on cycle?",
    hint: "Honest answer — Baseline meets you where you are.",
    kind: "single",
    choices: [
      { value: "every-shot", label: "Every shot" },
      { value: "weekly", label: "Weekly-ish" },
      { value: "monthly", label: "Now and then" },
      { value: "rarely", label: "Not really" },
    ],
  },
  hydration_l: {
    key: "hydration_l",
    prompt: "Litres of water on a typical day?",
    kind: "scale",
    min: 1,
    max: 5,
    unit: "L",
  },
};

// ─── Adaptive selection — pick the questions that matter for this user ──────

/** Returns the ordered question list for a given user state. */
export function buildIntake(
  profile: Profile,
  readings: MarkerReading[],
): IntakeQuestion[] {
  const status = (id: string) => {
    const r = readings.find((x) => x.markerId === id);
    if (!r) return null;
    return computeStatus(id, r.value, profile.sex);
  };
  const need = (id: string) => {
    const s = status(id);
    return s === "low" || s === "watch";
  };

  const out: IntakeQuestion[] = [];

  // Universal foundations — always ask.
  out.push(Q.sleep_hours, Q.exercise_days);

  // Vitamin D track.
  if (need("vitamin_d") || profile.sun === "indoor") {
    out.push(Q.morning_sun_freq);
  }

  // B12 track.
  if (need("vitamin_b12") || profile.diet === "veg" || profile.diet === "vegan") {
    out.push(Q.b12_sources);
  }

  // Iron / Ferritin track.
  if (need("ferritin") || profile.sex === "female") {
    out.push(Q.iron_pairing, Q.chai_with_meals);
  }

  // LDL track.
  if (need("ldl")) {
    out.push(Q.cooking_fat);
  }

  // HbA1c / fasting glucose track.
  if (need("hba1c") || need("fasting_glucose")) {
    out.push(Q.refined_carbs, Q.walk_after_meals);
  }

  // Stress — ask if anything's off, since it touches everything.
  const anyAttention = readings.some(
    (r) => computeStatus(r.markerId, r.value, profile.sex) !== "in",
  );
  if (anyAttention) out.push(Q.stress_level);

  // PCOS opt-in.
  if (profile.pcosTracking) out.push(Q.cycle_regular);

  // TRT opt-in.
  if (profile.trtTracking) out.push(Q.trt_logging);

  // Dedupe (just in case) and cap at 7 — keep it short.
  const seen = new Set<string>();
  return out.filter((q) => (seen.has(q.key) ? false : (seen.add(q.key), true))).slice(0, 7);
}

/** Are all "required" questions in the chosen set actually answered? */
export function isIntakeComplete(
  questions: IntakeQuestion[],
  answers: IntakeAnswers,
): boolean {
  return questions.every((q) => {
    const v = (answers as Record<string, unknown>)[q.key];
    if (q.kind === "multi") return Array.isArray(v) && v.length > 0;
    return v !== undefined && v !== null && v !== "";
  });
}
