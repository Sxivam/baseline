// POST /api/recommend-explain — write personalised "why this for you"
// rationales for the top recommended panels, plus an optional bundle-savings
// hint. LLM via OpenRouter when a key is set; §7-safe static fallback
// otherwise. One regenerate at temperature 0 if the §7 gate fails, then fall
// back to deterministic copy.

import { RECOMMEND_EXPLAIN_SYSTEM, containsBannedPattern } from "@/lib/prompts";
import {
  chatComplete,
  extractJson,
  hasOpenRouterKey,
  modelFor,
} from "@/lib/openrouter";
import {
  staticRationales,
  type RecommendExplainInput,
  type RecommendExplainOutput,
} from "@/lib/recommend-explain";

export const runtime = "nodejs";
export const maxDuration = 30;

function passes(out: RecommendExplainOutput): boolean {
  return (
    out.safety_check === "pass" &&
    !containsBannedPattern(JSON.stringify(out))
  );
}

export async function POST(request: Request) {
  let input: RecommendExplainInput;
  try {
    input = (await request.json()) as RecommendExplainInput;
  } catch {
    return Response.json({ error: "bad_input" }, { status: 400 });
  }
  if (!input?.topPanels?.length || !input.attentionMarkers?.length) {
    return Response.json({ error: "no_input" }, { status: 400 });
  }

  // No key configured → deterministic §7-safe fallback.
  if (!hasOpenRouterKey()) {
    return Response.json({ ...staticRationales(input), source: "fallback" });
  }

  const userMsg = `INPUTS:\n${JSON.stringify(input, null, 2)}`;

  try {
    let raw = await chatComplete({
      model: modelFor("copy"),
      system: RECOMMEND_EXPLAIN_SYSTEM,
      userContent: userMsg,
      maxTokens: 700,
      temperature: 0.5,
    });
    let payload = extractJson<RecommendExplainOutput>(raw);

    // One regenerate at temperature 0 if the §7 gate fails.
    if (!passes(payload)) {
      raw = await chatComplete({
        model: modelFor("copy"),
        system: RECOMMEND_EXPLAIN_SYSTEM,
        userContent: userMsg,
        maxTokens: 700,
        temperature: 0,
      });
      payload = extractJson<RecommendExplainOutput>(raw);
    }

    if (!passes(payload)) {
      return Response.json({ ...staticRationales(input), source: "fallback" });
    }

    return Response.json({ ...payload, source: "openrouter" });
  } catch (err) {
    console.error("[api/recommend-explain]", err);
    return Response.json({ ...staticRationales(input), source: "fallback" });
  }
}
