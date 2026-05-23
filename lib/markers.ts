// Marker reference data — ported from handoff/markers.json.
// Thresholds are commonly-cited values for Indian adults; decay rates are the
// heuristic from forecast.md.

import type { Sex } from "./types";

export interface Thresholds {
  low: number;
  high: number;
  idealMin?: number;
  idealMax?: number;
}

export interface MarkerDecay {
  baselinePerMonth: number;
  modifiers: Record<string, number>; // keyed "diet.veg", "sun.indoor", ...
  seasonFactor: Record<string, number> | null; // keyed "Jan".."Dec"
}

export interface MarkerDef {
  id: string;
  name: string;
  fullName: string;
  unit: string;
  /** unsexed thresholds (most markers) */
  thresholds?: Thresholds;
  /** sex-specific thresholds (ferritin, hdl) */
  thresholdsMale?: Thresholds;
  thresholdsFemale?: Thresholds;
  inV1Forecast: boolean;
  decay?: MarkerDecay;
  lever: string;
  icon: string;
  accent: string;
  labAliases: string[];
}

export const MARKERS: Record<string, MarkerDef> = {
  vitamin_d: {
    id: "vitamin_d",
    name: "Vitamin D",
    fullName: "Vitamin D (25-OH)",
    unit: "ng/mL",
    thresholds: { low: 30, high: 100, idealMin: 40 },
    inV1Forecast: true,
    decay: {
      baselinePerMonth: -1.5,
      modifiers: {
        "sun.indoor": -0.7,
        "sun.mixed": 0,
        "sun.outdoor": 0.5,
        "diet.veg": -0.2,
        "diet.vegan": -0.4,
        "diet.non-veg": 0,
        "diet.mixed": 0,
      },
      seasonFactor: {
        Aug: -0.5, Sep: -0.7, Oct: -0.8, Nov: -1.0, Dec: -1.0,
        Jan: -0.8, Feb: -0.5, Mar: 0.2, Apr: 0.4, May: 0.5, Jun: 0.5, Jul: 0.3,
      },
    },
    lever: "sun exposure + dietary D sources",
    icon: "sun",
    accent: "#ca0013",
    labAliases: [
      "25(OH)D", "25-OH-D", "25-Hydroxy Vitamin D", "Vitamin D Total",
      "Vit D", "Vitamin D (25-Hydroxy)", "Vit. D", "25-OH Vitamin D (Total)",
    ],
  },

  vitamin_b12: {
    id: "vitamin_b12",
    name: "Vitamin B12",
    fullName: "Vitamin B12",
    unit: "pg/mL",
    thresholds: { low: 300, high: 900, idealMin: 400 },
    inV1Forecast: true,
    decay: {
      baselinePerMonth: -8,
      modifiers: {
        "diet.veg": -12,
        "diet.vegan": -25,
        "diet.non-veg": 0,
        "diet.mixed": -4,
      },
      seasonFactor: null,
    },
    lever: "dietary B12 (eggs, dairy, fortified foods)",
    icon: "leaf",
    accent: "#a76c00",
    labAliases: [
      "Vit B12", "Cyanocobalamin", "Vitamin B12 (Cobalamin)", "B12",
      "Cobalamin", "Vitamin B-12",
    ],
  },

  ferritin: {
    id: "ferritin",
    name: "Ferritin",
    fullName: "Serum Ferritin",
    unit: "ng/mL",
    thresholdsMale: { low: 30, high: 400, idealMin: 50 },
    thresholdsFemale: { low: 15, high: 150, idealMin: 30 },
    inV1Forecast: false,
    lever: "iron-rich foods + vitamin C co-ingestion",
    icon: "droplet",
    accent: "#a8917a",
    labAliases: ["Ferritin", "Serum Ferritin", "Iron Stores (Ferritin)"],
  },

  ldl: {
    id: "ldl",
    name: "LDL",
    fullName: "LDL Cholesterol",
    unit: "mg/dL",
    thresholds: { low: 0, high: 100, idealMax: 100 },
    inV1Forecast: false,
    lever: "saturated fat reduction + cardio frequency",
    icon: "heart",
    accent: "#a76c00",
    labAliases: ["LDL", "LDL-C", "LDL Cholesterol", "LDL-Cholesterol", "LDL Direct", "LDL Cholesterol - Direct"],
  },

  hdl: {
    id: "hdl",
    name: "HDL",
    fullName: "HDL Cholesterol",
    unit: "mg/dL",
    thresholdsMale: { low: 40, high: 90, idealMin: 50 },
    thresholdsFemale: { low: 50, high: 90, idealMin: 60 },
    inV1Forecast: false,
    lever: "cardio + healthy fats (omega-3, olive oil)",
    icon: "heart",
    accent: "#5f8a7a",
    labAliases: ["HDL", "HDL-C", "HDL Cholesterol", "HDL Direct", "HDL Cholesterol - Direct"],
  },

  hba1c: {
    id: "hba1c",
    name: "HbA1c",
    fullName: "HbA1c (Glycated Hemoglobin)",
    unit: "%",
    thresholds: { low: 0, high: 5.7, idealMax: 5.6 },
    inV1Forecast: false,
    lever: "carb quality + meal timing",
    icon: "apple",
    accent: "#5f8a7a",
    labAliases: ["HbA1c", "Glycated Hemoglobin", "A1c", "Hemoglobin A1c", "Glycohemoglobin"],
  },

  fasting_glucose: {
    id: "fasting_glucose",
    name: "Fasting Glucose",
    fullName: "Fasting Blood Glucose",
    unit: "mg/dL",
    thresholds: { low: 70, high: 99, idealMax: 99 },
    inV1Forecast: false,
    lever: "evening carb load + sleep quality",
    icon: "droplet",
    accent: "#5f8a7a",
    labAliases: [
      "FBS", "Fasting Blood Sugar", "Fasting Glucose", "Glucose Fasting",
      "Blood Sugar Fasting", "Plasma Glucose Fasting",
    ],
  },

  tsh: {
    id: "tsh",
    name: "TSH",
    fullName: "Thyroid Stimulating Hormone",
    unit: "µIU/mL",
    thresholds: { low: 0.4, high: 4.5, idealMin: 0.5, idealMax: 3.0 },
    inV1Forecast: false,
    lever: "iodine + selenium + stress management",
    icon: "spark",
    accent: "#5f8a7a",
    labAliases: ["TSH", "Thyroid Stimulating Hormone", "Thyrotropin", "TSH Ultrasensitive", "TSH - Ultrasensitive"],
  },
};

/** Display order for dashboards / lists. */
export const MARKER_ORDER = [
  "vitamin_d", "vitamin_b12", "ferritin", "ldl", "hdl", "hba1c", "fasting_glucose", "tsh",
];

/** Markers whose "attention" state is a HIGH value, not a low one. */
export const INVERTED_HIGH = new Set(["ldl", "hba1c", "fasting_glucose"]);

/** Resolve the thresholds to use for a marker given the user's sex. */
export function thresholdsFor(def: MarkerDef, sex: Sex): Thresholds {
  if (def.thresholds) return def.thresholds;
  if (sex === "female" && def.thresholdsFemale) return def.thresholdsFemale;
  if (def.thresholdsMale) return def.thresholdsMale;
  return def.thresholdsFemale ?? { low: 0, high: Number.POSITIVE_INFINITY };
}
