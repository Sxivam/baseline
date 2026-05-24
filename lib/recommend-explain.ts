// Personalised marketplace rationales — input builder + §7-safe static
// fallback. The LLM (via /api/recommend-explain) handles the warm copy; this
// file deterministically produces equivalent-shape output when no key is set
// or the §7 gate fails twice.

import { MARKERS } from "./markers";
import { PANELS } from "./panels";
import type { Profile } from "./types";
import type { ScoredPanel } from "./recommend";

export interface ForecastSummary {
  markerId: string;
  last_value: number;
  current_estimate: number;
  projected_date: string;
  threshold: number;
}

export interface ExplainPanelInput {
  id: string;
  lab: string;
  name: string;
  price: number;
  markers: string[];
  sampleType: string;
  coveredMarkers: string[];
  extraMarkers: string[];
  waste: number;
}

export interface RecommendExplainInput {
  profile: {
    firstName: string;
    age: number;
    sex: string;
    diet: string;
    sun: string;
    city: string;
    pcosTracking: boolean;
  };
  attentionMarkers: string[];
  forecastSummary: ForecastSummary | null;
  topPanels: ExplainPanelInput[];
}

export interface RecommendExplainOutput {
  primaryPanelId: string;
  rationales: { panelId: string; rationale: string }[];
  bundleHint: string | null;
  safety_check: "pass" | "fail";
}

/** Shape the top scored panels + profile + forecast into the prompt input. */
export function buildExplainInput(
  profile: Profile,
  attentionMarkers: string[],
  forecastSummary: ForecastSummary | null,
  topScored: ScoredPanel[],
): RecommendExplainInput {
  return {
    profile: {
      firstName: profile.firstName,
      age: profile.age,
      sex: profile.sex,
      diet: profile.diet,
      sun: profile.sun,
      city: profile.city,
      pcosTracking: profile.pcosTracking,
    },
    attentionMarkers,
    forecastSummary,
    topPanels: topScored.slice(0, 3).map((s) => ({
      id: s.panel.id,
      lab: s.panel.lab,
      name: s.panel.name,
      price: s.panel.price,
      markers: s.panel.markers,
      sampleType: s.panel.sampleType,
      coveredMarkers: s.coveredMarkers,
      extraMarkers: s.extraMarkers,
      waste: s.waste,
    })),
  };
}

/** §7-safe deterministic fallback — used when no key or LLM fails the gate. */
export function staticRationales(input: RecommendExplainInput): RecommendExplainOutput {
  const { topPanels, attentionMarkers, profile, forecastSummary } = input;

  if (topPanels.length === 0) {
    return { primaryPanelId: "", rationales: [], bundleHint: null, safety_check: "pass" };
  }

  const markerNames = attentionMarkers
    .map((m) => MARKERS[m]?.name ?? m)
    .join(" + ");

  const rationales = topPanels.map((p) => {
    const coveredNames = p.coveredMarkers
      .map((m) => MARKERS[m]?.name ?? m)
      .join(" + ");
    const homeNote = p.sampleType === "home" ? " home collection," : "";
    const wasteNote =
      p.waste > 0.5 && p.extraMarkers.length > 2 && p.coveredMarkers.length <= 1
        ? ` It's a ${p.markers.length}-marker package, so most of it is overkill for a single re-test.`
        : "";
    const forecastNote =
      forecastSummary && p.coveredMarkers.includes(forecastSummary.markerId)
        ? ` Times well with the ${MARKERS[forecastSummary.markerId]?.name ?? "marker"} drift expected by ${forecastSummary.projected_date}.`
        : "";
    return {
      panelId: p.id,
      rationale: `Covers ${coveredNames || markerNames} from ${p.lab} at ₹${p.price},${homeNote} ${profile.sun === "indoor" ? "which suits an indoors-mostly day" : "delivered to you"}.${wasteNote}${forecastNote}`.replace(/\s+/g, " ").trim(),
    };
  });

  // Bundle hint: if 2+ attention markers and one panel covers all of them
  // for less than the sum of the cheapest single-marker panels in `topPanels`.
  let bundleHint: string | null = null;
  if (attentionMarkers.length >= 2) {
    const combo = topPanels.find((p) =>
      attentionMarkers.every((m) => p.coveredMarkers.includes(m)),
    );
    if (combo) {
      // Search ALL panels (not just the top 3 we're showing) for the cheapest
      // single-marker option per attention marker — that's what the user would
      // realistically book separately.
      const sumSingles = attentionMarkers.reduce((sum, m) => {
        const single = PANELS
          .filter((p) => p.markers.length === 1 && p.markers[0] === m)
          .sort((a, b) => a.price - b.price)[0];
        return sum + (single?.price ?? 0);
      }, 0);
      if (sumSingles > 0 && sumSingles > combo.price) {
        const savings = sumSingles - combo.price;
        bundleHint = `Booking the ${combo.lab} ${combo.name} (₹${combo.price}) saves ₹${savings} vs separate ${markerNames} tests — and it's one home collection, not two.`;
      }
    }
  }

  return {
    primaryPanelId: topPanels[0].id,
    rationales,
    bundleHint,
    safety_check: "pass",
  };
}
