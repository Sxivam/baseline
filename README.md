# Baseline

> Tracking, not diagnosis.

Baseline turns a one-time blood test into an ongoing, nudged habit. Upload a blood report → Claude parses your markers → see your baseline → for Vitamin D and B12, a decay forecast projects when each crosses its threshold → an email nudge fires ~3 weeks before. The test is the cold start; the loop is the product.

Built for the Sprinto Growth Associate take-home, May 2026.

## The loop

| Route | What it does |
|---|---|
| `/start` | Onboarding — name, age, sex, diet, sun, city (+ an optional PCOS lifestyle pathway for female users) |
| `/upload` | PDF dropzone → `/api/parse` (Claude). Manual entry is always one click away |
| `/dashboard` | Per-marker status (in / watch / low). Hero card + forecast preview + queued nudge |
| `/forecast/[marker]` | Decay forecast for D & B12 — observed curve, projected crossing, factor explainer |
| `/nudges/[id]/preview` | The rendered email from `/api/generate-nudge` — the loop closing |
| `/tests` | Aggregated home-based blood-test marketplace (PharmEasy, Tata 1mg, Thyrocare, Redcliffe) — sorted by what you actually need to re-test |

## Non-negotiable: §7

Baseline is an **awareness and tracking tool, not a medical service**. All generated copy is gated by:

1. A non-negotiables block in the Claude system prompts (no dosing, no diagnosis, no urgency words).
2. A server-side regex check on every response.
3. A §7-safe static fallback (in `lib/copy.ts`, `lib/nudge.ts`) used if the Claude output ever misses.
4. A persistent disclaimer on every screen.

The PCOS pathway (female users) is **lifestyle tracking + awareness only** — never a screen or diagnosis.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind v4** + Nunito (`next/font/google`)
- **Zustand** with localStorage persistence
- **OpenRouter** — OpenAI-compatible Claude models, called server-side, for PDF parsing and personalised nudge copy

## Quick start

```bash
npm install
cp .env.example .env.local
# add your OPENROUTER_API_KEY to .env.local
npm run dev
```

The app runs at `http://localhost:3000` (or whatever port the launch config sets). Without a key it runs on deterministic fallbacks, so the loop is still demoable end-to-end — drop a key in to switch on live PDF parsing + Claude-written nudge copy.

## Project layout

```
app/
  start/            onboarding
  upload/           PDF parse + manual fallback
  dashboard/        baseline + forecast preview + nudge card
  forecast/[marker] decay chart for D / B12
  nudges/[id]/preview rendered email
  api/parse         OpenRouter PDF parsing
  api/generate-nudge OpenRouter copy generation
components/
  ui.tsx            design system primitives
  ForecastChart.tsx data-driven decay chart
  PcosLens.tsx      §7-safe PCOS lifestyle lens
lib/
  markers.ts        marker reference (thresholds, decay rates, lab aliases)
  forecast.ts       decay heuristic — projectMarker / findCrossing / nudgeDate
  status.ts         in / watch / low computation
  prompts.ts        Claude system prompts + safety gate
  openrouter.ts     fetch-based client (PDF + prompt caching)
  store.ts          Zustand store (persisted to localStorage)
  copy.ts           static §7-pre-approved copy
  nudge.ts          nudge input builder + static fallback payload
  demo.ts           deterministic demo seed (Shivam's PharmEasy report)
  tokens.ts         design tokens
```

## Env vars

| Name | Required | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | for live Claude calls | — (fallbacks otherwise) |
| `OPENROUTER_MODEL` | no | `anthropic/claude-sonnet-4.5` |
| `OPENROUTER_MODEL_PARSE` | no | falls back to `OPENROUTER_MODEL` |
| `OPENROUTER_MODEL_COPY` | no | falls back to `OPENROUTER_MODEL` |
| `OPENROUTER_BASE_URL` | no | `https://openrouter.ai/api/v1` |

## Nightly price refresh

The marketplace at `/tests` reads from `data/panels.json`. A Playwright scraper (`scripts/scrape-panels.ts`) hits each panel's public page nightly via a GitHub Action (`.github/workflows/scrape-panels.yml`) at 03:00 UTC (~08:30 IST) and commits the refreshed prices back. Selectors are best-guess per lab; a broken selector for one panel degrades gracefully (skip + keep prior price + previous `lastVerified` date). If *every* panel fails the CI run goes red — visible signal that the lab sites all redesigned at once.

Run locally:

```bash
npm install --no-save playwright tsx
npx playwright install chromium
npx tsx scripts/scrape-panels.ts
```

Selector strategies live in `STRATEGIES` inside the script — extend or fix per-lab there.

