// Nightly price refresh for data/panels.json. Run by .github/workflows/
// scrape-panels.yml at 03:00 UTC daily (≈ 08:30 IST). Locally:
//
//   npm install --no-save playwright tsx
//   npx playwright install chromium
//   npx tsx scripts/scrape-panels.ts
//
// Failure mode by design: a broken selector for one lab degrades to "skip
// this panel, keep its existing price + last-verified date." A total bust
// (0 panels updated) exits non-zero so the CI run flags it.

import { chromium, type Page } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface Panel {
  id: string;
  lab: string;
  name: string;
  price: number;
  markers: string[];
  sampleType: string;
  tat: string;
  url: string;
  lastVerified: string;
}

const FILE = resolve(process.cwd(), "data/panels.json");
const panels: Panel[] = JSON.parse(readFileSync(FILE, "utf8"));
const today = new Date().toISOString().slice(0, 10);

// Per-lab price extraction. Selectors are best-guesses for May 2026 — they'll
// need maintenance when the lab sites redesign. Ordered: try meta tags (most
// reliable, often used for analytics/SEO), then class-name patterns, then a
// last-resort text match on "₹".
const STRATEGIES: Record<string, string[]> = {
  PharmEasy: [
    'meta[itemprop="price"]',
    '[class*="DiagnosticItemCard_priceLabel"]',
    '[class*="DiagnosticItemCard_offerPrice"]',
    '[class*="price"]',
    'span:has-text("₹")',
  ],
  "Tata 1mg": [
    'meta[itemprop="price"]',
    '[class*="PackageHeader__price"]',
    '[class*="DiscountedPrice"]',
    '[class*="LabPackageHeader"]',
    '[class*="price"]',
    'span:has-text("₹")',
  ],
  Thyrocare: [
    'meta[itemprop="price"]',
    '[class*="price"]',
    "[data-price]",
    'span:has-text("₹")',
  ],
  "Redcliffe Labs": [
    'meta[itemprop="price"]',
    '[class*="price"]',
    '[class*="Price"]',
    'span:has-text("₹")',
  ],
  Healthians: ['[class*="price"]', 'span:has-text("₹")'],
  Apollo: ['[class*="price"]', '[class*="Price"]', 'span:has-text("₹")'],
};

async function extractPriceText(page: Page, lab: string): Promise<string | null> {
  const selectors = STRATEGIES[lab] || ['span:has-text("₹")'];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      const count = await el.count();
      if (!count) continue;
      if (sel.startsWith("meta")) {
        const v = await el.getAttribute("content");
        if (v) return v;
        continue;
      }
      if (sel.includes("[data-price]")) {
        const v = await el.getAttribute("data-price");
        if (v) return v;
        continue;
      }
      const text = await el.textContent({ timeout: 1500 });
      if (text && text.trim()) return text;
    } catch {
      // try next selector
    }
  }
  return null;
}

function parsePrice(text: string | null): number | null {
  if (!text) return null;
  // Strip ₹, "Rs", commas, whitespace; pull the first 2–5 digit number.
  const cleaned = text.replace(/[,\s₹]/g, "").replace(/Rs\.?/gi, "");
  const m = cleaned.match(/(\d{2,5})(?!\d)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  // Sane bounds: panels in India range ~₹100 to ~₹15,000.
  if (n < 50 || n > 20000) return null;
  return n;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Baseline-scraper/1.0",
    viewport: { width: 1280, height: 900 },
    locale: "en-IN",
  });

  let updated = 0;
  for (const panel of panels) {
    const page = await ctx.newPage();
    try {
      await page.goto(panel.url, {
        waitUntil: "domcontentloaded",
        timeout: 25_000,
      });
      // Lab sites are SPAs — give them a beat to render dynamic content.
      await page
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => {});
      const text = await extractPriceText(page, panel.lab);
      const price = parsePrice(text);
      if (price !== null) {
        if (price !== panel.price) {
          console.log(`~ ${panel.id}: ₹${panel.price} → ₹${price}`);
        } else {
          console.log(`= ${panel.id}: ₹${price}`);
        }
        panel.price = price;
        panel.lastVerified = today;
        updated++;
      } else {
        console.warn(
          `x ${panel.id}: couldn't extract a sensible price (raw: ${JSON.stringify(
            text,
          )?.slice(0, 120)})`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`x ${panel.id}: ${msg.slice(0, 150)}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();

  writeFileSync(FILE, JSON.stringify(panels, null, 2) + "\n");
  console.log(`\nVerified ${updated}/${panels.length} panels.`);

  if (updated === 0) {
    console.error("No panels verified — exiting non-zero so CI flags it.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
