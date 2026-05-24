// Panel recommendation — the "policybazaar intelligence" layer.
// Given the markers the user needs to re-test, score every panel by coverage,
// price, bundle waste, and home-collection. Top 3 surface as "Recommended."

import { PANELS, type Panel } from "./panels";

export interface ScoredPanel {
  panel: Panel;
  score: number;
  coverage: number; // 0..1 — fraction of needed markers this panel covers
  coveredMarkers: string[]; // intersection of panel.markers and needed
  extraMarkers: string[]; // panel markers the user didn't ask for
  waste: number; // 0..1 — fraction of panel markers that weren't needed
}

/**
 * Score panels for a given set of needed markers. Higher score = better fit.
 *
 *   score = 0.5·coverage      // covers the markers you actually need
 *         − 0.3·priceNorm     // cheaper is better (normalised across the set)
 *         − 0.2·waste         // bundle bloat is bad (a 60-marker package for 1 needed marker)
 *         + 0.1·homeBonus     // small bonus for home collection
 *
 * Panels with zero coverage are filtered out. When `needed` is empty, panels
 * are returned sorted by price ascending (cheap entry tests first).
 */
export function recommend(
  needed: string[],
  panels: Panel[] = PANELS,
): ScoredPanel[] {
  if (needed.length === 0) {
    return panels
      .map((p) => scoreSinglePanel(p, []))
      .sort((a, b) => a.panel.price - b.panel.price);
  }

  const needSet = new Set(needed);
  const priceMax = Math.max(...panels.map((p) => p.price), 1);

  return panels
    .map((p) => {
      const coveredMarkers = p.markers.filter((m) => needSet.has(m));
      const extraMarkers = p.markers.filter((m) => !needSet.has(m));
      const coverage = coveredMarkers.length / needSet.size;
      const waste =
        p.markers.length === 0 ? 0 : extraMarkers.length / p.markers.length;
      const priceNorm = p.price / priceMax;
      const homeBonus = p.sampleType === "home" || p.sampleType === "both" ? 1 : 0;
      const score =
        0.5 * coverage - 0.3 * priceNorm - 0.2 * waste + 0.1 * homeBonus;
      return { panel: p, score, coverage, coveredMarkers, extraMarkers, waste };
    })
    .filter((s) => s.coverage > 0)
    .sort((a, b) => b.score - a.score);
}

function scoreSinglePanel(p: Panel, needed: string[]): ScoredPanel {
  const needSet = new Set(needed);
  const coveredMarkers = p.markers.filter((m) => needSet.has(m));
  const extraMarkers = p.markers.filter((m) => !needSet.has(m));
  return {
    panel: p,
    score: -p.price,
    coverage: needed.length ? coveredMarkers.length / needed.length : 0,
    coveredMarkers,
    extraMarkers,
    waste: p.markers.length ? extraMarkers.length / p.markers.length : 0,
  };
}

/** The single cheapest panel that covers every needed marker (or null). */
export function cheapestCovering(
  needed: string[],
  panels: Panel[] = PANELS,
): Panel | null {
  if (needed.length === 0) return null;
  const needSet = new Set(needed);
  const matching = panels.filter((p) => needed.every((m) => p.markers.includes(m)));
  if (matching.length === 0) {
    // No single panel covers everything — return the highest-coverage cheapest.
    const ranked = recommend(needed, panels);
    return ranked[0]?.panel ?? null;
  }
  return matching.sort((a, b) => a.price - b.price)[0];
}
