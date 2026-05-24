// Curated marketplace of home-based blood tests. data/panels.json is the
// source of truth — hand-curated for v1, refreshed nightly by the Playwright
// scraper in scripts/scrape-panels.ts.

import rawPanels from "@/data/panels.json";

export type SampleType = "home" | "lab" | "both";

export interface Panel {
  id: string;
  lab: string;
  name: string;
  price: number; // INR
  markers: string[]; // canonical marker ids from markers.ts
  sampleType: SampleType;
  tat: string; // human-readable turnaround, e.g. "24h"
  url: string;
  lastVerified: string; // ISO date
}

export const PANELS: Panel[] = rawPanels as Panel[];

export const LABS: string[] = Array.from(new Set(PANELS.map((p) => p.lab))).sort();

/** Latest `lastVerified` date across all panels — surface as "prices verified <date>". */
export function lastDataRefresh(): string {
  return PANELS.map((p) => p.lastVerified).sort().reverse()[0] ?? "";
}
