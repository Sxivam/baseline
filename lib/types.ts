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

/** Claude-generated nudge email payload (see prompts.md copy-gen schema). */
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
