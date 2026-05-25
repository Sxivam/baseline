// POST /api/generate-plan — produces the four-week curated plan + cadence.
// LLM via OpenRouter when a key is set; §7-safe deterministic fallback
// otherwise. UI uses the fallback as the instant-render baseline and upgrades
// to the LLM version when it arrives.

import { PLAN_SYSTEM, containsBannedPattern } from "@/lib/prompts";
import {
  chatComplete,
  extractJson,
  hasOpenRouterKey,
  modelFor,
} from "@/lib/openrouter";
import { staticPlan, type PlanInput } from "@/lib/plan";
import type { Plan, PlanWeek } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 45;

interface RawMove {
  emoji?: string;
  title?: string;
  why?: string;
  action?: string;
  markersHelped?: string[];
}
interface RawWeek {
  week?: number;
  focus?: string;
  moves?: RawMove[];
}
interface RawPlan {
  summary?: string;
  severity?: "gentle" | "moderate" | "urgent";
  headline?: string;
  weeks?: RawWeek[];
  nudgeTracks?: {
    weeklyCheckin?: { day?: string; topics?: string[] };
    retests?: { markerId?: string; markerName?: string; whenSoft?: string }[];
  };
  safety_check?: "pass" | "fail";
}

function normalise(raw: RawPlan): Plan | null {
  if (!raw || !Array.isArray(raw.weeks) || raw.weeks.length < 1) return null;
  const weeks: PlanWeek[] = raw.weeks
    .slice(0, 4)
    .map((w, i) => ({
      week: typeof w.week === "number" ? w.week : i + 1,
      focus: w.focus ?? `Week ${i + 1}`,
      moves: (w.moves ?? [])
        .filter(
          (m): m is Required<RawMove> & { markersHelped: string[] } =>
            !!m && typeof m.title === "string" && typeof m.action === "string",
        )
        .slice(0, 2)
        .map((m) => ({
          emoji: m.emoji || "✨",
          title: m.title,
          why: m.why ?? "",
          action: m.action,
          markersHelped: Array.isArray(m.markersHelped) ? m.markersHelped : [],
        })),
    }))
    .filter((w) => w.moves.length > 0);

  if (weeks.length === 0) return null;

  return {
    summary: raw.summary ?? "",
    severity: raw.severity ?? "moderate",
    headline: raw.headline ?? "Your four-week plan.",
    weeks,
    nudgeTracks: {
      weeklyCheckin: {
        day: raw.nudgeTracks?.weeklyCheckin?.day ?? "Sunday",
        topics: raw.nudgeTracks?.weeklyCheckin?.topics ?? [],
      },
      retests: (raw.nudgeTracks?.retests ?? [])
        .filter((r) => !!r?.markerId && !!r.markerName && !!r.whenSoft)
        .map((r) => ({
          markerId: r.markerId as string,
          markerName: r.markerName as string,
          whenSoft: r.whenSoft as string,
        })),
    },
    startedAt: null,
    safety_check: raw.safety_check === "pass" ? "pass" : "fail",
  };
}

function looksClean(p: Plan): boolean {
  if (p.safety_check !== "pass") return false;
  return !containsBannedPattern(JSON.stringify(p));
}

export async function POST(request: Request) {
  let input: PlanInput;
  try {
    input = (await request.json()) as PlanInput;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!input?.profile || !Array.isArray(input.markers)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  if (!hasOpenRouterKey()) {
    return Response.json({ ...staticPlan(input), source: "static" });
  }

  const fallback = staticPlan(input);

  try {
    const userContent = JSON.stringify({
      ...input,
      proposedSeverity: fallback.severity,
    });
    const raw = await chatComplete({
      model: modelFor("copy"),
      system: PLAN_SYSTEM,
      cacheSystem: true,
      maxTokens: 2000,
      temperature: 0.45,
      userContent,
    });

    let parsed = normalise(extractJson<RawPlan>(raw));
    if (parsed && looksClean(parsed)) {
      return Response.json({ ...parsed, source: "llm" });
    }

    // single quiet retry at temp 0
    const retry = await chatComplete({
      model: modelFor("copy"),
      system: PLAN_SYSTEM,
      cacheSystem: true,
      maxTokens: 2000,
      temperature: 0,
      userContent,
    });
    parsed = normalise(extractJson<RawPlan>(retry));
    if (parsed && looksClean(parsed)) {
      return Response.json({ ...parsed, source: "llm_retry" });
    }

    return Response.json({ ...fallback, source: "fallback_safety" });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn("[api/generate-plan] falling back —", detail);
    return Response.json({
      ...fallback,
      source: "fallback_error",
      fallbackReason: detail.slice(0, 200),
    });
  }
}
