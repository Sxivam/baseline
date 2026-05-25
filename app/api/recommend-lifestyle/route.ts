// POST /api/recommend-lifestyle — personalised lifestyle moves based on the
// user's markers + profile. LLM via OpenRouter when a key is set;
// §7-safe deterministic fallback otherwise.

import { LIFESTYLE_SYSTEM, containsBannedPattern } from "@/lib/prompts";
import {
  chatComplete,
  extractJson,
  hasOpenRouterKey,
  modelFor,
} from "@/lib/openrouter";
import {
  staticLifestyle,
  type LifestyleInput,
  type LifestylePayload,
  type LifestyleMove,
} from "@/lib/lifestyle";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RawMove {
  id?: string;
  emoji?: string;
  title?: string;
  why?: string;
  action?: string;
  markersHelped?: string[];
}

interface RawLifestyle {
  summary?: string;
  moves?: RawMove[];
  safety_check?: "pass" | "fail";
}

function normalise(raw: RawLifestyle): LifestylePayload | null {
  if (!raw || !Array.isArray(raw.moves)) return null;
  const moves: LifestyleMove[] = raw.moves
    .filter(
      (m): m is Required<RawMove> & { markersHelped: string[] } =>
        !!m &&
        typeof m.title === "string" &&
        typeof m.action === "string" &&
        typeof m.why === "string",
    )
    .slice(0, 5)
    .map((m, i) => ({
      id: m.id || `move-${i}`,
      emoji: m.emoji || "✨",
      title: m.title,
      why: m.why,
      action: m.action,
      markersHelped: Array.isArray(m.markersHelped) ? m.markersHelped : [],
    }));
  if (moves.length === 0) return null;
  return {
    summary: raw.summary || "",
    moves,
    safety_check: raw.safety_check === "pass" ? "pass" : "fail",
  };
}

function looksClean(p: LifestylePayload): boolean {
  if (p.safety_check !== "pass") return false;
  return !containsBannedPattern(JSON.stringify(p));
}

export async function POST(request: Request) {
  let input: LifestyleInput;
  try {
    input = (await request.json()) as LifestyleInput;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!input?.profile || !Array.isArray(input.markers)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // No key — return the deterministic static moves.
  if (!hasOpenRouterKey()) {
    return Response.json({ ...staticLifestyle(input), source: "static" });
  }

  try {
    const raw = await chatComplete({
      model: modelFor("copy"),
      system: LIFESTYLE_SYSTEM,
      cacheSystem: true,
      maxTokens: 1400,
      temperature: 0.5,
      userContent: JSON.stringify(input),
    });

    const parsed = normalise(extractJson<RawLifestyle>(raw));
    if (parsed && looksClean(parsed)) {
      return Response.json({ ...parsed, source: "llm" });
    }

    // One quiet regeneration at zero temperature if the gate trips.
    const retry = await chatComplete({
      model: modelFor("copy"),
      system: LIFESTYLE_SYSTEM,
      cacheSystem: true,
      maxTokens: 1400,
      temperature: 0,
      userContent: JSON.stringify(input),
    });
    const reparsed = normalise(extractJson<RawLifestyle>(retry));
    if (reparsed && looksClean(reparsed)) {
      return Response.json({ ...reparsed, source: "llm_retry" });
    }

    return Response.json({ ...staticLifestyle(input), source: "fallback_safety" });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn("[api/recommend-lifestyle] falling back —", detail);
    return Response.json({
      ...staticLifestyle(input),
      source: "fallback_error",
      fallbackReason: detail.slice(0, 200),
    });
  }
}
