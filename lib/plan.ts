// Plan generator. Takes profile + markers + intake answers, returns a 4-week
// curated action plan + weekly check-in cadence + re-test alert schedule.
//
// Two paths:
//   1. Rule-based static generator (this file) — always §7-safe, ships fast.
//   2. LLM enhancement via /api/generate-plan that respects this shape.

import { MARKERS, INVERTED_HIGH, thresholdsFor } from "./markers";
import { computeStatus } from "./status";
import { buildForecast } from "./forecast";
import { softDate } from "./format";
import type {
  IntakeAnswers,
  MarkerReading,
  Plan,
  PlanSeverity,
  PlanWeek,
  PlanWeekMove,
  Profile,
} from "./types";

export interface PlanInput {
  profile: Profile;
  markers: {
    markerId: string;
    name: string;
    value: number;
    unit: string;
    status: "in" | "watch" | "low";
    threshold: number;
  }[];
  intake: IntakeAnswers;
}

export function buildPlanInput(
  profile: Profile,
  readings: MarkerReading[],
  intake: IntakeAnswers,
): PlanInput {
  return {
    profile,
    markers: readings
      .map((r) => {
        const def = MARKERS[r.markerId];
        if (!def) return null;
        const t = thresholdsFor(def, profile.sex);
        const status = computeStatus(r.markerId, r.value, profile.sex);
        const threshold = INVERTED_HIGH.has(r.markerId) ? t.high : t.low;
        return {
          markerId: r.markerId,
          name: def.fullName,
          value: r.value,
          unit: def.unit,
          status,
          threshold,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    intake,
  };
}

function severityOf(input: PlanInput): PlanSeverity {
  const lows = input.markers.filter((m) => m.status === "low").length;
  const watches = input.markers.filter((m) => m.status === "watch").length;
  if (lows >= 2) return "urgent";
  if (lows === 1 || watches >= 2) return "moderate";
  return "gentle";
}

// ─── Rule-based plan ────────────────────────────────────────────────────────

const VEG = new Set(["veg", "vegan"]);

function attentionIds(input: PlanInput): string[] {
  return input.markers.filter((m) => m.status !== "in").map((m) => m.markerId);
}

/** Pool of move templates the rule engine picks from. */
function movesPool(input: PlanInput): Record<string, PlanWeekMove[]> {
  const { profile, intake } = input;
  const ids = new Set(attentionIds(input));

  const pool: Record<string, PlanWeekMove[]> = {
    sun: [],
    food_d: [],
    b12: [],
    iron: [],
    cardio: [],
    fats: [],
    carbs: [],
    sleep: [],
    stress: [],
  };

  if (ids.has("vitamin_d") || profile.sun === "indoor") {
    const indoor = profile.sun === "indoor";
    const sunFreq = intake.morning_sun_freq;
    pool.sun.push({
      emoji: "🌞",
      title: "Morning sun habit",
      why: indoor
        ? "You're indoors-mostly, and sun is the highest-leverage Vitamin D move — bigger than food."
        : "Sun is the most reliable lever for D. Your reading sits in the watch zone.",
      action:
        sunFreq === "rarely"
          ? "Start small: open a window and sit by it for 10 minutes with coffee. Build to 20 min outside before 10 AM."
          : "Lock in 15-20 minutes of direct morning sun, arms exposed. Same time daily — make it automatic.",
      markersHelped: ["vitamin_d"],
    });
    if (profile.diet !== "vegan") {
      pool.food_d.push({
        emoji: "🍳",
        title: "Anchor a D source at breakfast",
        why:
          profile.diet === "veg"
            ? "Sun does the heavy lifting; eggs and fortified milk layer on top."
            : "Eggs, fatty fish, fortified dairy — food layers on top of sun.",
        action:
          profile.diet === "veg"
            ? "One anchor a day: eggs if you eat them, fortified milk, or cremini/shiitake mushrooms cooked sunny-side."
            : "Eggs daily; fatty fish (salmon, sardines, mackerel) twice in the week.",
        markersHelped: ["vitamin_d"],
      });
    }
  }

  if (ids.has("vitamin_b12") || VEG.has(profile.diet)) {
    const sources = intake.b12_sources ?? [];
    const hasNone = sources.includes("none");
    pool.b12.push({
      emoji: VEG.has(profile.diet) ? "🌾" : "🥚",
      title: VEG.has(profile.diet) ? "Layer fortified B12 sources" : "Make B12 sources daily",
      why: VEG.has(profile.diet)
        ? "Plant-only diets draw B12 down slowly. Your reading reflects that — fortified sources fix it without changing your diet."
        : "B12 dips even on non-veg if eggs/dairy/fish aren't consistent. Consistency matters more than volume.",
      action: hasNone
        ? "Start with one fortified breakfast cereal + plant milk daily. Look for ≥2.4 µg B12 per serving on the label."
        : VEG.has(profile.diet)
          ? "Add fortified plant milk to your coffee, nutritional yeast on rice/pasta, fortified cereal at breakfast."
          : "Eggs at breakfast, dairy with one meal, fish/meat once across the week. Make it routine.",
      markersHelped: ["vitamin_b12"],
    });
  }

  if (ids.has("ferritin") || profile.sex === "female") {
    const pairs = intake.iron_pairing;
    const chai = intake.chai_with_meals === "yes";
    pool.iron.push({
      emoji: "🥗",
      title: "Make iron meals absorbable",
      why:
        profile.sex === "female"
          ? "Iron stores often dip in young women — absorption depends more on pairing than on iron content."
          : "Iron stores on the lower end. The pairing rule beats raw iron quantity.",
      action: [
        pairs !== "always"
          ? "Squeeze lemon or pair citrus / amla with every iron-rich meal — boosts absorption ~3×."
          : "You're already pairing — keep that anchored.",
        chai
          ? "Move chai/coffee at least an hour away from meals — tannins block iron."
          : null,
        profile.diet === "non-veg"
          ? "Red meat once a week stacks the deck."
          : "Rajma, spinach, dates, fortified atta — rotate them through the week.",
      ]
        .filter(Boolean)
        .join(" "),
      markersHelped: ["ferritin"],
    });
  }

  if (ids.has("hdl") || ids.has("ldl")) {
    const days = intake.exercise_days ?? 0;
    pool.cardio.push({
      emoji: "🏃",
      title: "4× a week cardio rhythm",
      why:
        ids.has("hdl") && ids.has("ldl")
          ? "Cardio nudges HDL up and LDL down — same lever, two outcomes."
          : ids.has("hdl")
            ? "HDL (the protective one) responds to consistent cardio more than to food."
            : "LDL drops a few points with regular cardio plus a softer hand on saturated fat.",
      action:
        days < 3
          ? "Start with three brisk 25-minute walks this week. Add a fourth by week 2. Conversational pace is enough."
          : "Hold your existing rhythm at 4 sessions. Mix one harder session in once a week.",
      markersHelped: ["hdl", "ldl"].filter((id) => ids.has(id)),
    });
    if (ids.has("ldl")) {
      const fat = intake.cooking_fat;
      pool.fats.push({
        emoji: "🫒",
        title: "Shift your default fats",
        why:
          "LDL responds best to swapping the type of fat, not cutting fat overall — easier and more sustainable.",
        action:
          fat === "ghee" || fat === "refined"
            ? "Switch your daily fat to olive or cold-pressed for cold uses. Keep ghee for warmth and weekend cooking."
            : "Add a daily handful of nuts and 2 servings of fatty fish (or flax/walnuts for veg) across the week.",
        markersHelped: ["ldl"],
      });
    }
  }

  if (ids.has("hba1c") || ids.has("fasting_glucose")) {
    const carbs = intake.refined_carbs;
    const walks = intake.walk_after_meals;
    pool.carbs.push({
      emoji: "🥕",
      title: "Front-load protein, walk after dinner",
      why:
        "Carb quality + meal sequence are the most repeatable levers for blood sugar over weeks.",
      action: [
        carbs === "daily"
          ? "Halve refined carbs this week — whole grains and dal carry the load."
          : "Hold the carb mix you have, just upgrade the order: protein + veg first, carbs second.",
        walks !== "always"
          ? "10-minute walk after dinner, every day. Phone in pocket, around the block."
          : "Keep the post-meal walk — it's the cheapest blood-sugar tool you have.",
      ]
        .filter(Boolean)
        .join(" "),
      markersHelped: ["hba1c", "fasting_glucose"].filter((id) => ids.has(id)),
    });
  }

  // Sleep + stress — universal anchors, only included if intake answers signal need.
  if ((intake.sleep_hours ?? 8) < 7) {
    pool.sleep.push({
      emoji: "😴",
      title: "Anchor sleep before tweaking food",
      why: "Under 7 hours moves cortisol, blood sugar, and recovery all in the wrong direction.",
      action:
        "Same bedtime ±30 min, screens off 30 minutes before. Wind-down ritual: shower, stretch, read. Aim 7+ hours.",
      markersHelped: [],
    });
  }
  if ((intake.stress_level ?? 0) >= 7) {
    pool.stress.push({
      emoji: "🌿",
      title: "Daily 10-minute decompress",
      why: "High stress moves the same dials as bad sleep — quietly, in the background, over weeks.",
      action:
        "Pick one: 10 min slow breathing, 10 min walking without phone, or 10 min journal. Same time daily.",
      markersHelped: [],
    });
  }

  return pool;
}

function compose(input: PlanInput): PlanWeek[] {
  const pool = movesPool(input);
  const ids = new Set(attentionIds(input));
  const dStat = input.markers.find((m) => m.markerId === "vitamin_d")?.status;
  const b12Stat = input.markers.find((m) => m.markerId === "vitamin_b12")?.status;
  const cardiacAttention = ids.has("hdl") || ids.has("ldl");
  const metabolicAttention = ids.has("hba1c") || ids.has("fasting_glucose");

  // Week 1 — foundations: sun + sleep + the single biggest lever.
  const w1: PlanWeekMove[] = [];
  if (pool.sun[0]) w1.push(pool.sun[0]);
  if (pool.sleep[0]) w1.push(pool.sleep[0]);
  if (w1.length < 2) {
    // backfill with the most-important attention move
    if (pool.b12[0]) w1.push(pool.b12[0]);
    else if (pool.iron[0]) w1.push(pool.iron[0]);
    else if (pool.cardio[0]) w1.push(pool.cardio[0]);
  }

  // Week 2 — food layering for the deficiencies.
  const w2: PlanWeekMove[] = [];
  if (b12Stat && b12Stat !== "in" && pool.b12[0]) w2.push(pool.b12[0]);
  if (ids.has("ferritin") && pool.iron[0]) w2.push(pool.iron[0]);
  if (dStat && dStat !== "in" && pool.food_d[0]) w2.push(pool.food_d[0]);
  if (w2.length === 0 && pool.b12[0]) w2.push(pool.b12[0]);
  if (w2.length === 0 && pool.iron[0]) w2.push(pool.iron[0]);

  // Week 3 — movement / metabolic.
  const w3: PlanWeekMove[] = [];
  if (cardiacAttention && pool.cardio[0]) w3.push(pool.cardio[0]);
  if (metabolicAttention && pool.carbs[0]) w3.push(pool.carbs[0]);
  if (ids.has("ldl") && pool.fats[0]) w3.push(pool.fats[0]);
  if (w3.length === 0 && pool.cardio[0]) w3.push(pool.cardio[0]);
  if (w3.length === 0) {
    // pure maintenance: ship a generic cardio move
    w3.push({
      emoji: "🏃",
      title: "Lock the cardio rhythm",
      why: "Four sessions a week is the maintenance floor — keeps HDL, LDL, and HbA1c happy.",
      action: "Four 30-minute brisk walks, runs, cycles, or swims. Same time-blocks as last week.",
      markersHelped: [],
    });
  }

  // Week 4 — consolidation + stress / sleep refinement.
  const w4: PlanWeekMove[] = [];
  if (pool.stress[0]) w4.push(pool.stress[0]);
  w4.push({
    emoji: "🧪",
    title: "Re-test what's drifting",
    why: "Numbers tell you whether the moves are landing. Cheaper than waiting six months and guessing.",
    action: ids.size
      ? `Re-test ${Array.from(ids)
          .map((id) => MARKERS[id]?.name ?? id)
          .slice(0, 2)
          .join(" + ")}. Mid-week morning, fasted if needed.`
      : "Re-test in 3 months — log the trend.",
    markersHelped: Array.from(ids),
  });

  return [
    { week: 1, focus: "Foundations — sun, sleep, the biggest lever", moves: w1.slice(0, 2) },
    { week: 2, focus: "Layer the food sources for what's drifting", moves: w2.slice(0, 2) },
    { week: 3, focus: cardiacAttention || metabolicAttention ? "Movement + metabolic load" : "Movement maintenance", moves: w3.slice(0, 2) },
    { week: 4, focus: "Consolidate + close the loop with a re-test", moves: w4.slice(0, 2) },
  ];
}

function buildRetestSchedule(
  input: PlanInput,
): Plan["nudgeTracks"]["retests"] {
  const out: Plan["nudgeTracks"]["retests"] = [];
  for (const m of input.markers) {
    const def = MARKERS[m.markerId];
    if (!def?.inV1Forecast) continue;
    if (m.status === "in") continue;
    const forecast = buildForecast(
      m.markerId,
      m.value,
      new Date(),
      input.profile,
    );
    if (forecast.nudgeDate) {
      out.push({
        markerId: m.markerId,
        markerName: def.name,
        whenSoft: `around ${softDate(forecast.nudgeDate)}`,
      });
    }
  }
  return out;
}

function weeklyTopics(severity: PlanSeverity, attention: string[]): string[] {
  const map: Record<string, string> = {
    vitamin_d: "sun streak",
    vitamin_b12: "B12 sources",
    ferritin: "iron pairing",
    ldl: "fats + cardio",
    hdl: "cardio consistency",
    hba1c: "carb quality + walks",
    fasting_glucose: "evening meal + walks",
    tsh: "foundations check",
  };
  const topics = attention.map((id) => map[id]).filter(Boolean);
  if (topics.length === 0) topics.push("sleep streak", "movement streak");
  if (severity === "urgent") topics.unshift("how the week felt");
  return Array.from(new Set(topics)).slice(0, 3);
}

function headlineFor(severity: PlanSeverity, attention: number, firstName: string): string {
  if (attention === 0) {
    return `Maintenance mode, ${firstName} — let's keep what's working.`;
  }
  if (severity === "urgent") {
    return `${firstName}, a few markers want attention — here's the plan.`;
  }
  if (severity === "moderate") {
    return `${firstName}, one lever to lean on, three to layer in.`;
  }
  return `${firstName}, here's a quietly effective four-week run.`;
}

function summaryFor(input: PlanInput, severity: PlanSeverity): string {
  const attention = input.markers.filter((m) => m.status !== "in");
  if (attention.length === 0) {
    return "Your numbers look comfortable. The plan focuses on the cheapest moves to hold that ground.";
  }
  if (severity === "urgent") {
    return "Two or more markers are under their lines. We start with the highest-leverage moves and add one new habit a week — over four weeks, the trend reverses.";
  }
  if (severity === "moderate") {
    return "One marker needs real attention. Foundation moves go in week one, food layering in week two, movement in week three, re-test in week four.";
  }
  return "Light drift in a few places. Four weeks of small, repeatable moves — then we re-check what changed.";
}

/** Deterministic, §7-safe four-week plan. */
export function staticPlan(input: PlanInput): Plan {
  const severity = severityOf(input);
  const attentionIdList = attentionIds(input);
  const weeks = compose(input);
  const retests = buildRetestSchedule(input);

  return {
    summary: summaryFor(input, severity),
    severity,
    headline: headlineFor(severity, attentionIdList.length, input.profile.firstName),
    weeks,
    nudgeTracks: {
      weeklyCheckin: {
        day: "Sunday",
        topics: weeklyTopics(severity, attentionIdList),
      },
      retests,
    },
    startedAt: null,
    safety_check: "pass",
  };
}
