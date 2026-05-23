// POST /api/generate-nudge — generate the personalised nudge email payload.
// Claude via OpenRouter when a key is set; §7-safe static fallback otherwise.
// Generated copy is gated by passesSafety; one regenerate, then fallback.

import { COPY_FEWSHOT, COPY_SYSTEM, passesSafety } from "@/lib/prompts";
import { chatComplete, extractJson, hasOpenRouterKey, modelFor } from "@/lib/openrouter";
import { staticNudge, type NudgeInput } from "@/lib/nudge";
import type { NudgePayload } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let input: NudgeInput;
  try {
    input = (await request.json()) as NudgeInput;
  } catch {
    return Response.json({ error: "bad_input" }, { status: 400 });
  }
  if (!input || !input.marker) {
    return Response.json({ error: "bad_input" }, { status: 400 });
  }

  // No key configured → §7-safe static fallback.
  if (!hasOpenRouterKey()) {
    return Response.json({ ...staticNudge(input), source: "fallback" });
  }

  const userMsg = `INPUTS:\n${JSON.stringify(input, null, 2)}\n\n${COPY_FEWSHOT}`;

  try {
    let raw = await chatComplete({
      model: modelFor("copy"),
      system: COPY_SYSTEM,
      userContent: userMsg,
      maxTokens: 900,
      temperature: 0.5,
    });
    let payload = extractJson<NudgePayload>(raw);

    // One regenerate at temperature 0 if the §7 gate fails.
    if (!passesSafety(payload)) {
      raw = await chatComplete({
        model: modelFor("copy"),
        system: COPY_SYSTEM,
        userContent: userMsg,
        maxTokens: 900,
        temperature: 0,
      });
      payload = extractJson<NudgePayload>(raw);
    }

    if (!passesSafety(payload)) {
      return Response.json({ ...staticNudge(input), source: "fallback" });
    }

    return Response.json({ ...payload, source: "openrouter" });
  } catch (err) {
    console.error("[api/generate-nudge]", err);
    return Response.json({ ...staticNudge(input), source: "fallback" });
  }
}
