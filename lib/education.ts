// Per-marker awareness content — surfaced in /tests when a marker is selected.
// Plain-English, §7-safe one-liners. Frequencies are commonly cited guidance,
// not personalised medical advice.

export interface MarkerEducation {
  frequency: string;
  whatItTellsYou: string;
}

export const EDUCATION: Record<string, MarkerEducation> = {
  vitamin_d: {
    frequency: "Every 6 months if low; annually if in range.",
    whatItTellsYou:
      "Your body's vitamin D stores. Drops in low-sun months and on plant-heavy diets.",
  },
  vitamin_b12: {
    frequency: "Every 6 months on plant-leaning diets; annually otherwise.",
    whatItTellsYou:
      "Circulating B12 — key for nerves, blood, and energy. Drifts down quietly over months.",
  },
  ferritin: {
    frequency: "Annually; every 6 months if low.",
    whatItTellsYou:
      "Your iron stores. Drops before clinical anaemia shows up — an early signal.",
  },
  ldl: {
    frequency: "Annually; sooner with family history.",
    whatItTellsYou:
      "The cholesterol that builds up in arteries over years. Diet and cardio are the levers.",
  },
  hdl: {
    frequency: "Annually.",
    whatItTellsYou: "Protective cholesterol — moves LDL out. Higher is better.",
  },
  hba1c: {
    frequency: "Every 6 months; annually if comfortably normal.",
    whatItTellsYou:
      "Average blood sugar over the last 3 months — an earlier signal than fasting glucose.",
  },
  fasting_glucose: {
    frequency: "Annually, paired with HbA1c.",
    whatItTellsYou:
      "Blood sugar after an overnight fast. Pairs with HbA1c for the metabolic picture.",
  },
  tsh: {
    frequency: "Every 1–2 years; sooner with symptoms or family history.",
    whatItTellsYou:
      "How hard your pituitary is pushing the thyroid. The first hormone to flag thyroid drift.",
  },
};
