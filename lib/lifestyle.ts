// Lifestyle recommendations — personalised "things to do" based on the user's
// markers + profile. Two paths:
//   1. LLM-generated via /api/recommend-lifestyle (§7-gated)
//   2. Deterministic static fallback (this file) — always §7-safe, profile-aware

import { MARKERS, MARKER_ORDER, INVERTED_HIGH, thresholdsFor } from "./markers";
import { computeStatus } from "./status";
import type { MarkerReading, MarkerStatus, Profile } from "./types";

export interface LifestyleMove {
  id: string;
  emoji: string;
  title: string;
  why: string;
  action: string;
  markersHelped: string[];
}

export interface LifestylePayload {
  summary: string;
  moves: LifestyleMove[];
  safety_check: "pass" | "fail";
}

export interface MarkerSummary {
  markerId: string;
  name: string;
  value: number;
  unit: string;
  status: MarkerStatus;
  threshold: number;
}

export interface LifestyleInput {
  profile: {
    firstName: string;
    age: number;
    sex: string;
    diet: string;
    sun: string;
    city: string;
    pcosTracking: boolean;
  };
  markers: MarkerSummary[];
}

/** Build the structured input for the LLM call. */
export function buildLifestyleInput(
  profile: Profile,
  readings: MarkerReading[],
): LifestyleInput {
  const markers: MarkerSummary[] = readings
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
    .filter((x): x is MarkerSummary => x !== null);

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
    markers,
  };
}

// ─── Static fallback — rules-based, profile-aware ──────────────────────────

interface CandidateMove extends LifestyleMove {
  priority: number; // higher = more relevant for this user
}

const VEG_DIETS = new Set(["veg", "vegan"]);

function candidates(input: LifestyleInput): CandidateMove[] {
  const { profile, markers } = input;
  const byId = new Map(markers.map((m) => [m.markerId, m]));

  const attention = (id: string): MarkerStatus | null => {
    const m = byId.get(id);
    return m && m.status !== "in" ? m.status : null;
  };

  const moves: CandidateMove[] = [];

  // ── Vitamin D ─────────────────────────────────────────────────────────
  const dStat = attention("vitamin_d");
  if (dStat || profile.sun === "indoor") {
    const indoor = profile.sun === "indoor";
    moves.push({
      id: "morning-sun",
      emoji: "🌞",
      title: "Catch morning sun before the day eats it",
      why: indoor
        ? `You said indoors-mostly — that's the biggest single lever on your Vitamin D, especially through ${seasonHint(profile.city)}.`
        : `Sun is the most reliable Vitamin D lever, and yours is ${dStat === "low" ? "currently under the line" : "in the watch zone"}.`,
      action:
        "15–20 minutes of direct sunlight before 10 AM, arms exposed. Even from a balcony works. Pair it with your coffee.",
      markersHelped: ["vitamin_d"],
      priority: dStat === "low" ? 100 : dStat === "watch" ? 70 : 40,
    });
  }
  if (dStat && profile.diet !== "vegan") {
    moves.push({
      id: "d-foods",
      emoji: "🍳",
      title: "Add a D-rich anchor at breakfast",
      why: `${dStat === "low" ? "Your Vitamin D is under the threshold" : "Your Vitamin D is on the lower side"} and food sources help layer on top of sun exposure.`,
      action:
        profile.diet === "veg"
          ? "Eggs (if you eat them), fortified milk, mushrooms (cremini/shiitake) cooked sunny-side. Aim for at least one anchor a day."
          : "Eggs, fatty fish (salmon, mackerel, sardines), fortified dairy. Two anchor servings in the week move the needle.",
      markersHelped: ["vitamin_d"],
      priority: dStat === "low" ? 80 : 50,
    });
  }

  // ── Vitamin B12 ───────────────────────────────────────────────────────
  const b12Stat = attention("vitamin_b12");
  if (b12Stat) {
    if (VEG_DIETS.has(profile.diet)) {
      moves.push({
        id: "b12-fortified",
        emoji: "🌾",
        title: "Layer in fortified B12 sources",
        why: `${profile.diet === "vegan" ? "Vegan diets" : "Plant-leaning diets"} draw B12 stores down slowly — yours is at ${byId.get("vitamin_b12")?.value} ${byId.get("vitamin_b12")?.unit}.`,
        action:
          profile.diet === "vegan"
            ? "Fortified plant milks (oat / almond), nutritional yeast on rice or pasta, fortified breakfast cereals. Look for ≥2.4 µg per serving on the label."
            : "Eggs and dairy daily if you eat them; fortified cereals on top. Paneer at one meal, curd at another covers a lot of ground.",
        markersHelped: ["vitamin_b12"],
        priority: b12Stat === "low" ? 95 : 65,
      });
    } else {
      moves.push({
        id: "b12-animal",
        emoji: "🥚",
        title: "Make B12 sources daily, not occasional",
        why: `Your B12 is ${b12Stat === "low" ? "under the comfortable range" : "on the lower side"} — even non-veg diets can dip if animal sources are sporadic.`,
        action:
          "Eggs at breakfast, dairy with at least one meal, and one fish/meat serving across the week. Consistency matters more than volume.",
        markersHelped: ["vitamin_b12"],
        priority: b12Stat === "low" ? 90 : 60,
      });
    }
  }

  // ── Ferritin (iron stores) ────────────────────────────────────────────
  const ferStat = attention("ferritin");
  if (ferStat) {
    moves.push({
      id: "iron-c-pair",
      emoji: "🥗",
      title: "Pair iron-rich meals with vitamin C",
      why: `${profile.sex === "female" ? "Iron stores often run low in young women" : "Your iron stores are on the lower end"} and absorption depends heavily on what you eat alongside.`,
      action:
        profile.diet === "non-veg"
          ? "Red meat or organ meats once a week. For veg sources (spinach, rajma, dates), squeeze lemon or eat citrus with the meal — boosts absorption ~3x. Skip chai/coffee for an hour either side."
          : "Spinach, rajma, dates, jaggery, fortified atta. Pair every iron-rich meal with vitamin C (lemon, amla, citrus). Keep chai/coffee >1 hour away from the meal — they block absorption.",
      markersHelped: ["ferritin"],
      priority: ferStat === "low" ? 85 : 55,
    });
  }

  // ── HDL / LDL — movement ─────────────────────────────────────────────
  const hdlStat = attention("hdl");
  const ldlStat = attention("ldl");
  if (hdlStat || ldlStat) {
    moves.push({
      id: "cardio-rhythm",
      emoji: "🏃",
      title: "Build a 4×30 cardio rhythm",
      why:
        hdlStat && ldlStat
          ? "Both HDL and LDL respond to the same lever — regular cardio. Yours need a nudge in opposite directions; movement does both."
          : hdlStat
            ? "HDL (the protective one) goes up with consistent cardio more than with diet — yours is on the lower side."
            : "LDL drops a few points with regular cardio plus a softer hand on saturated fat.",
      action:
        "Four 30-minute sessions a week — brisk walk, cycle, run, swim. Conversational pace is enough; consistency matters more than intensity.",
      markersHelped: ["hdl", "ldl"].filter((id) => attention(id)),
      priority: (hdlStat ? 70 : 0) + (ldlStat ? 70 : 0),
    });
  }
  if (ldlStat) {
    moves.push({
      id: "ldl-fats",
      emoji: "🫒",
      title: "Swap saturated for unsaturated fats",
      why: `Your LDL is just above the optimal line — the easiest move is shifting which fats show up on your plate, not cutting fat overall.`,
      action:
        "Olive oil over ghee for cold uses, nuts as the default snack, fatty fish twice a week (or flaxseed/walnuts for veg). Keep the deep-fried stuff to weekends.",
      markersHelped: ["ldl"],
      priority: 60,
    });
  }

  // ── HbA1c / fasting glucose — meal structure ──────────────────────────
  const hba1cStat = attention("hba1c");
  const glucStat = attention("fasting_glucose");
  if (hba1cStat || glucStat) {
    moves.push({
      id: "carb-pair",
      emoji: "🥕",
      title: "Front-load protein and veg at every meal",
      why: hba1cStat
        ? "HbA1c reflects three months of blood-sugar averages — meal sequence and carb quality are the most repeatable levers."
        : "Fasting glucose responds to evening meal load and sleep — these tend to move together.",
      action:
        "Protein + veg first, carbs second. Whole grains over refined. Try a 15-minute walk after dinner — it flattens the glucose curve more than most things.",
      markersHelped: ["hba1c", "fasting_glucose"].filter((id) => attention(id)),
      priority: 75,
    });
  }

  // ── TSH — stress / iodine / selenium ──────────────────────────────────
  const tshStat = attention("tsh");
  if (tshStat) {
    moves.push({
      id: "tsh-foundations",
      emoji: "🌿",
      title: "Foundation moves while you book a doctor visit",
      why: "TSH outside the typical range is worth a clinician's read — meanwhile, the lifestyle foundations help regardless of why it's off.",
      action:
        "Brazil nuts (1–2/day for selenium), iodised salt, sleep before midnight, and 10 minutes of slow breathing daily. Book a TSH re-check + doctor conversation.",
      markersHelped: ["tsh"],
      priority: 88,
    });
  }

  // ── PCOS lifestyle (opt-in) ───────────────────────────────────────────
  if (profile.pcosTracking) {
    moves.push({
      id: "pcos-rhythm",
      emoji: "🧘",
      title: "Anchor your day around sleep + movement",
      why: "You opted into PCOS lifestyle tracking — sleep regularity, movement, and meal timing are the levers with the strongest evidence for metabolic balance.",
      action:
        "Same bedtime ±30 min, 7+ hours, and a 20-minute walk or strength session four times a week. Track how your cycle feels alongside — patterns often emerge in a month.",
      markersHelped: [],
      priority: 65,
    });
  }

  // ── Always-on baseline if no attention markers ────────────────────────
  if (moves.length === 0) {
    moves.push(
      {
        id: "baseline-sun",
        emoji: "🌞",
        title: "Hold your sun habit",
        why: "Your markers look comfortable. Maintenance is mostly about not letting the easy levers slip.",
        action:
          "15 minutes of morning sun on most days. It's the cheapest insurance for Vitamin D as the seasons shift.",
        markersHelped: ["vitamin_d"],
        priority: 50,
      },
      {
        id: "baseline-protein",
        emoji: "🥚",
        title: "Keep a protein anchor at every meal",
        why: "Protein at every meal makes B12, iron, and HDL all easier to maintain — and keeps energy steady.",
        action:
          "Eggs / dairy / legumes / fish — at least one anchor per meal. The exact source matters less than the consistency.",
        markersHelped: ["vitamin_b12", "ferritin", "hdl"],
        priority: 45,
      },
      {
        id: "baseline-walk",
        emoji: "🚶",
        title: "10 minutes after dinner",
        why: "A short walk after the biggest meal of the day flattens the glucose spike — pays off long-term on HbA1c.",
        action:
          "Phone in pocket, ten minutes around the block after dinner. That's it.",
        markersHelped: ["hba1c", "fasting_glucose"],
        priority: 40,
      },
    );
  }

  return moves;
}

function seasonHint(_city: string): string {
  // Loose Indian seasonal cue. City-aware tuning is a v2.
  const m = new Date().getMonth();
  if (m >= 8 && m <= 11) return "the lower-light autumn-to-winter window";
  if (m === 0 || m === 1) return "the lingering shorter winter days";
  if (m >= 2 && m <= 4) return "the brighter spring window — easy to bank D";
  return "the high-sun summer months";
}

/** Static §7-safe fallback. Always returns 3–5 moves, sorted by priority. */
export function staticLifestyle(input: LifestyleInput): LifestylePayload {
  const moves = candidates(input)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map(({ priority: _p, ...m }) => m);

  const attentionCount = input.markers.filter((m) => m.status !== "in").length;
  const summary =
    attentionCount === 0
      ? `Your baseline looks comfortable, ${input.profile.firstName} — these are the maintenance moves that keep it there.`
      : attentionCount === 1
        ? `${input.profile.firstName}, one marker needs a little attention — these moves stack the deck without overwhelming the week.`
        : `${input.profile.firstName}, a few markers want a nudge — start with the first move; the others compound.`;

  return { summary, moves, safety_check: "pass" };
}

/** Order moves with attention-bound ones first (UI helper). */
export function sortMovesByPriority(
  moves: LifestyleMove[],
  attentionIds: Set<string>,
): LifestyleMove[] {
  return [...moves].sort((a, b) => {
    const aHit = a.markersHelped.some((id) => attentionIds.has(id)) ? 1 : 0;
    const bHit = b.markersHelped.some((id) => attentionIds.has(id)) ? 1 : 0;
    return bHit - aHit;
  });
}

/** Use the marker order from MARKERS for "covers these" chips on each move. */
export const MARKER_DISPLAY_ORDER = MARKER_ORDER;
