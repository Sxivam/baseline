# Baseline

> Tracking, not diagnosis.

Baseline turns a one-time blood test into an ongoing, nudged habit. Upload a blood report → an LLM (via OpenRouter) parses your markers → see your baseline → for Vitamin D and B12, a decay forecast projects when each crosses its threshold → an email nudge fires ~3 weeks before. The test is the cold start; the loop is the product.

Built for the Sprinto Growth Associate take-home, May 2026.

## The loop

| Route | What it does |
|---|---|
| `/start` | Onboarding — name, age, sex, diet, sun, city (+ an optional PCOS lifestyle pathway for female users) |
| `/upload` | PDF dropzone → `/api/parse` (LLM via OpenRouter). Manual entry is always one click away |
| `/dashboard` | Per-marker status (in / watch / low). Hero card + forecast preview + queued nudge |
| `/forecast/[marker]` | Decay forecast for D & B12 — observed curve, projected crossing, factor explainer |
| `/nudges` | Cadence overview — every queued nudge with date, status, and a manual "send to my inbox" trigger |
| `/nudges/[id]/preview` | The rendered email from `/api/generate-nudge` — the loop closing |
| `/tests` | Aggregated home-based blood-test marketplace (PharmEasy, Tata 1mg, Thyrocare, Redcliffe) — sorted by what you actually need to re-test |

## Non-negotiable: §7

Baseline is an **awareness and tracking tool, not a medical service**. All generated copy is gated by:

1. A non-negotiables block in the LLM system prompts (no dosing, no diagnosis, no urgency words).
2. A server-side regex check on every response.
3. A §7-safe static fallback (in `lib/copy.ts`, `lib/nudge.ts`) used if the LLM output ever misses.
4. A persistent disclaimer on every screen.

The PCOS pathway (female users) is **lifestyle tracking + awareness only** — never a screen or diagnosis.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind v4** + Nunito (`next/font/google`)
- **Zustand** with localStorage persistence
- **OpenRouter** — OpenAI-compatible API for LLM calls (server-side) — PDF parsing and personalised nudge copy. Default model is `google/gemini-2.0-flash-exp:free`; override per-job via env vars

## Quick start

```bash
npm install
cp .env.example .env.local
# add your OPENROUTER_API_KEY to .env.local
npm run dev
```

The app runs at `http://localhost:3000` (or whatever port the launch config sets). Without a key it runs on deterministic fallbacks, so the loop is still demoable end-to-end — drop a key in to switch on live PDF parsing + LLM-written nudge copy.

## Project layout

```
app/
  start/              onboarding
  upload/             PDF parse + manual fallback
  dashboard/          baseline + forecast preview + nudge card
  forecast/[marker]   decay chart for D / B12
  nudges/             cadence overview — every queued nudge + send buttons
  nudges/[id]/preview rendered email + "send to my inbox" trigger
  tests/              home-based blood-test marketplace
  api/parse           OpenRouter PDF parsing
  api/generate-nudge  OpenRouter copy generation
  api/send-nudge      Resend transactional send
  api/recommend-explain  per-panel rationale copy
components/
  ui.tsx              design system primitives
  ForecastChart.tsx   data-driven decay chart
  PcosLens.tsx        §7-safe PCOS lifestyle lens
lib/
  markers.ts          marker reference (thresholds, decay rates, lab aliases)
  forecast.ts         decay heuristic — projectMarker / findCrossing / nudgeDate
  status.ts           in / watch / low computation
  prompts.ts          LLM system prompts + safety gate
  openrouter.ts       fetch-based client (PDF + prompt caching)
  email.ts            Resend fetch wrapper
  email-template.ts   inline-CSS HTML renderer for the nudge email
  store.ts            Zustand store (persisted to localStorage)
  copy.ts             static §7-pre-approved copy
  nudge.ts            nudge input builder + static fallback payload
  recommend.ts        panel-recommendation scoring
  demo.ts             deterministic demo seed (Shivam's PharmEasy report)
  tokens.ts           design tokens
```

## Env vars

| Name | Required | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | for live LLM calls | — (fallbacks otherwise) |
| `OPENROUTER_MODEL` | no | `anthropic/claude-sonnet-4.5` |
| `OPENROUTER_MODEL_PARSE` | no | falls back to `OPENROUTER_MODEL` |
| `OPENROUTER_MODEL_COPY` | no | falls back to `OPENROUTER_MODEL` |
| `OPENROUTER_BASE_URL` | no | `https://openrouter.ai/api/v1` |
| `RESEND_API_KEY` | for real email sends | — (preview UI shows a hint if missing) |
| `RESEND_FROM_ADDRESS` | no | `Baseline <onboarding@resend.dev>` (Resend's shared sender) |

## Nudge cadence — how the email actually fires

The mechanic isn't "buy a test, get a result" — it's the loop that follows. For every Vitamin D / B12 reading, the forecast in `lib/forecast.ts` projects monthly values forward 6 months. The nudge fires **~3 weeks before the projected crossing** (or 4 months out if it never crosses in-window — the periodic check-in case). Already-below readings get a next-morning nudge.

In production, a daily cron (Vercel Cron or a GitHub Action) hits an internal route at ~09:00 IST, finds every user whose `forecast.nudgeDate === today`, and POSTs each to `/api/send-nudge`. That route uses the cached LLM copy from `/api/generate-nudge` (or `staticNudge` as a §7-safe fallback), renders the HTML via `lib/email-template.ts`, and ships it through **Resend**.

For the demo:
- `/nudges` is the cadence overview — one row per forecastable marker with a reading, showing the schedule and a manual "Send to me" button.
- Inside `/nudges/[id]/preview`, the same manual trigger sits below the email card.
- Drop a `RESEND_API_KEY` in `.env.local` (or the Vercel project's env) to switch real sends on. Without one, the button still works but returns 503 + a friendly hint — the rest of the loop still renders deterministically.

## Nightly price refresh

The marketplace at `/tests` reads from `data/panels.json`. A Playwright scraper (`scripts/scrape-panels.ts`) hits each panel's public page nightly via a GitHub Action (`.github/workflows/scrape-panels.yml`) at 03:00 UTC (~08:30 IST) and commits the refreshed prices back. Selectors are best-guess per lab; a broken selector for one panel degrades gracefully (skip + keep prior price + previous `lastVerified` date). If *every* panel fails the CI run goes red — visible signal that the lab sites all redesigned at once.

Run locally:

```bash
npm install --no-save playwright tsx
npx playwright install chromium
npx tsx scripts/scrape-panels.ts
```

Selector strategies live in `STRATEGIES` inside the script — extend or fix per-lab there.

