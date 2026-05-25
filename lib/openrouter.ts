// OpenRouter client — Baseline calls LLMs through OpenRouter's
// OpenAI-compatible API. Server-only (uses the secret key).
// Default model is a free tier option; override per-job via env vars.

const BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/auto";

export function hasOpenRouterKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function modelFor(job: "parse" | "copy"): string {
  if (job === "parse") return process.env.OPENROUTER_MODEL_PARSE || DEFAULT_MODEL;
  return process.env.OPENROUTER_MODEL_COPY || DEFAULT_MODEL;
}

// A single content part of a user message.
export type ContentPart =
  | { type: "text"; text: string }
  | {
      type: "file";
      file: { filename: string; file_data: string };
    };

interface ChatOptions {
  model: string;
  system: string;
  userContent: string | ContentPart[];
  maxTokens?: number;
  temperature?: number;
  /** mark the system block ephemeral so OpenRouter caches it (Anthropic) */
  cacheSystem?: boolean;
  /** include the PDF file-parser plugin (for document inputs) */
  pdf?: boolean;
}

/** Call OpenRouter chat completions and return the text content. */
export async function chatComplete(opts: ChatOptions): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const systemContent = opts.cacheSystem
    ? [
        {
          type: "text",
          text: opts.system,
          cache_control: { type: "ephemeral" },
        },
      ]
    : opts.system;

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: opts.userContent },
    ],
    max_tokens: opts.maxTokens ?? 1200,
    temperature: opts.temperature ?? 0,
    stream: false,
  };
  if (opts.pdf) {
    // "pdf-text" engine: free for all models, server-side text extraction.
    // "native" only works for models with native PDF vision (Claude, GPT-4o).
    // Override via OPENROUTER_PDF_ENGINE if needed.
    const engine = process.env.OPENROUTER_PDF_ENGINE || "pdf-text";
    body.plugins = [{ id: "file-parser", pdf: { engine } }];
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://baseline.health",
      "X-Title": "Baseline",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 400)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((p: { text?: string }) => p?.text ?? "").join("");
  }
  return "";
}

/** Pull a JSON object out of a model response, tolerating stray fences/prose. */
export function extractJson<T>(text: string): T {
  let s = text.trim();
  // strip ```json ... ``` fences if present
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // otherwise slice from the first { to the last }
  if (!s.startsWith("{")) {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  }
  return JSON.parse(s) as T;
}
