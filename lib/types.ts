// Shared types for Baseline.

export type Sex = "female" | "male";
export type Diet = "veg" | "vegan" | "non-veg" | "mixed";
export type Sun = "indoor" | "mixed" | "outdoor";

export interface Profile {
  firstName: string;
  age: number;
  sex: Sex;
  diet: Diet;
  sun: Sun;
  city: string;
  /** female users can opt into PCOS-relevant lifestyle tracking */
  pcosTracking: boolean;
  /** male users on prescribed HRT/TRT can opt into cycle tracking */
  trtTracking: boolean;
}

export type MarkerStatus = "in" | "watch" | "low";

/** A parsed/entered marker reading. */
export interface MarkerReading {
  markerId: string; // canonical id, e.g. "vitamin_d"
  name: string; // display name
  value: number;
  unit: string;
  status: MarkerStatus;
  referenceRange?: { low: number; high: number } | null;
  confidence?: number; // 0..1, from the parser
}

export interface ParseResult {
  markers: MarkerReading[];
  testDate: string | null; // ISO YYYY-MM-DD
  labName: string | null;
  parseConfidence: "high" | "medium" | "low";
}

/** One projected month in a decay forecast. */
export interface ForecastPoint {
  date: string; // ISO
  value: number;
  belowThreshold: boolean;
}

export interface Forecast {
  markerId: string;
  points: ForecastPoint[];
  crossingDate: string | null; // ISO — when value likely dips under threshold
  nudgeDate: string | null; // ISO — when to send the nudge
  alreadyBelow: boolean; // value was already under threshold at test time
  neverCrosses: boolean; // doesn't cross within the 6-month window
}

/** Self-reported cycle data for the PCOS lifestyle pathway. */
export interface CycleLog {
  lastPeriodStart: string | null; // ISO date
  cycleLength: number | null; // days
  regularity: "regular" | "irregular" | "not-sure" | null;
}

// ── HRT / TRT (male opt-in tracking) ───────────────────────────────────────
// Pure tracking for someone already on a prescribed protocol. Never recommend
// doses, esters, or schedules. Never imply a diagnosis. Tone: logbook.

export type TrtCompound =
  | "propionate"
  | "cypionate"
  | "enanthate"
  | "undecanoate"
  | "other";

/** One observation entry across the post-injection arc. Stages 1-5 map roughly
 *  to peak → steady → descent → low → trough; user-controlled, not clinical. */
export interface TrtStageEntry {
  stage: 1 | 2 | 3 | 4 | 5;
  loggedAt: string; // ISO
  mood?: number; // 1-10
  energy?: number; // 1-10
  libido?: number; // 1-10
  notes?: string;
}

export interface TrtLog {
  compound: TrtCompound | null;
  lastInjectionDate: string | null; // ISO
  /** Free-text label the user maintains themselves; never set by Baseline. */
  doseLabel?: string;
  /** Typical days between shots — driven by compound. Defaults: prop=3, cyp/ena=7. */
  cycleLengthDays: number | null;
  entries: TrtStageEntry[];
}

/** LLM-generated nudge email payload (see prompts.md copy-gen schema). */
export interface NudgePayload {
  subject: string;
  hero_line: string; // two lines joined with "\n"
  greeting: string;
  context_paragraph: string;
  projection_intro: string;
  three_things: { emoji: string; text: string }[];
  question_card: { label: string; text: string };
  signoff: string;
  safety_check: "pass" | "fail";
}

// ── Intake + plan ─────────────────────────────────────────────────────────

/** Free-form-ish answers collected on /intake; only ask what's relevant. */
export interface IntakeAnswers {
  sleep_hours?: number;
  stress_level?: number; // 1-10
  exercise_days?: number; // 0-7
  morning_sun_freq?: "rarely" | "sometimes" | "often";
  b12_sources?: string[]; // ["eggs","dairy","fortified","fish"]
  iron_pairing?: "always" | "sometimes" | "never";
  chai_with_meals?: "yes" | "no";
  cooking_fat?: "ghee" | "refined" | "olive" | "mixed";
  refined_carbs?: "daily" | "few-week" | "rarely";
  walk_after_meals?: "always" | "sometimes" | "never";
  cycle_regular?: "yes" | "no" | "not-sure"; // PCOS-only
  trt_logging?: "every-shot" | "weekly" | "monthly" | "rarely"; // TRT-only
  hydration_l?: number; // optional
}

export interface PlanWeekMove {
  emoji: string;
  title: string;
  why: string;
  action: string;
  markersHelped: string[];
}

export interface PlanWeek {
  week: number; // 1..4
  focus: string; // theme: "Sun + sleep foundations", "Iron + B12 layering"…
  moves: PlanWeekMove[];
}

export type PlanSeverity = "gentle" | "moderate" | "urgent";

export interface PlanNudgeTracks {
  /** Weekly accountability check-in. */
  weeklyCheckin: {
    day: string; // e.g. "Sunday"
    topics: string[]; // what each week's check-in covers
  };
  /** Re-test alerts per marker, driven by the forecast. */
  retests: { markerId: string; markerName: string; whenSoft: string }[];
}

export interface Plan {
  summary: string; // 1-line angle
  severity: PlanSeverity;
  headline: string; // 1-line headline for the reveal
  weeks: PlanWeek[]; // 4 entries
  nudgeTracks: PlanNudgeTracks;
  startedAt: string | null; // ISO when accepted
  safety_check: "pass" | "fail";
}
