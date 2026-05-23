// Demo seed — Shivam's real PharmEasy report (tested 3 May 2026, 24/M).
// Used to prefill the manual-entry form and as the deterministic fallback for
// /api/parse when no OpenRouter key is set. Ferritin and fasting glucose are
// genuinely absent from this report, so they are omitted (per spec — never
// invent a value).

import type { ParseResult, Sex } from "./types";
import { computeStatus } from "./status";

const DEMO_SEX: Sex = "male";

export const DEMO_RAW: { markerId: string; name: string; value: number; unit: string }[] = [
  { markerId: "vitamin_d", name: "Vitamin D (25-OH)", value: 45, unit: "ng/mL" },
  { markerId: "vitamin_b12", name: "Vitamin B12", value: 290, unit: "pg/mL" },
  { markerId: "ldl", name: "LDL Cholesterol", value: 87, unit: "mg/dL" },
  { markerId: "hdl", name: "HDL Cholesterol", value: 43, unit: "mg/dL" },
  { markerId: "hba1c", name: "HbA1c", value: 5.0, unit: "%" },
  { markerId: "tsh", name: "TSH", value: 1.59, unit: "µIU/mL" },
];

export const DEMO_TEST_DATE = "2026-05-03";
export const DEMO_LAB = "PharmEasy";

/** Full ParseResult-shaped seed (statuses computed for a male profile). */
export const DEMO_PARSE: ParseResult = {
  markers: DEMO_RAW.map((m) => ({
    ...m,
    status: computeStatus(m.markerId, m.value, DEMO_SEX),
    confidence: 1,
  })),
  testDate: DEMO_TEST_DATE,
  labName: DEMO_LAB,
  parseConfidence: "high",
};
