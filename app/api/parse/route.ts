// POST /api/parse — extract markers from an uploaded blood report PDF.
// Uses OpenRouter (default: free Gemini model) when a key is set; falls back
// to the deterministic demo result otherwise so the loop always works.

import { PARSE_SYSTEM, parseOutputIsClean } from "@/lib/prompts";
import { chatComplete, extractJson, hasOpenRouterKey, modelFor } from "@/lib/openrouter";
import { MARKERS } from "@/lib/markers";
import { DEMO_LAB, DEMO_RAW, DEMO_TEST_DATE } from "@/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RawMarker {
  marker_id?: string;
  name?: string;
  value?: number | string;
  unit?: string;
  reference_range?: { low: number; high: number } | null;
  confidence?: number;
}

interface RawParse {
  markers?: RawMarker[];
  test_date?: string | null;
  lab_name?: string | null;
  parse_confidence?: string;
}

function demoResult() {
  return {
    markers: DEMO_RAW.map((m) => ({
      markerId: m.markerId,
      name: m.name,
      value: m.value,
      unit: m.unit,
      confidence: 1,
    })),
    testDate: DEMO_TEST_DATE,
    labName: DEMO_LAB,
    parseConfidence: "high" as const,
    source: "demo",
  };
}

export async function POST(request: Request) {
  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    /* fallthrough */
  }
  if (!file) {
    return Response.json({ error: "no_file" }, { status: 400 });
  }

  // No key configured → deterministic demo fallback.
  if (!hasOpenRouterKey()) {
    return Response.json(demoResult());
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:application/pdf;base64,${buf.toString("base64")}`;

    const raw = await chatComplete({
      model: modelFor("parse"),
      system: PARSE_SYSTEM,
      cacheSystem: true,
      pdf: true,
      maxTokens: 1800,
      userContent: [
        {
          type: "text",
          text: "Extract this blood report's biomarkers into the JSON schema. Output only the JSON object.",
        },
        {
          type: "file",
          file: { filename: file.name || "report.pdf", file_data: dataUrl },
        },
      ],
    });

    if (!parseOutputIsClean(raw)) {
      console.warn("[api/parse] §7 gate tripped — using demo");
      return Response.json({ ...demoResult(), source: "demo_fallback" });
    }

    const parsed = extractJson<RawParse>(raw);
    const markers = (parsed.markers || [])
      .filter(
        (m) =>
          m &&
          typeof m.marker_id === "string" &&
          MARKERS[m.marker_id] &&
          Number.isFinite(Number(m.value)),
      )
      .map((m) => ({
        markerId: m.marker_id as string,
        name: m.name || MARKERS[m.marker_id as string].fullName,
        value: Number(m.value),
        unit: m.unit || MARKERS[m.marker_id as string].unit,
        confidence: typeof m.confidence === "number" ? m.confidence : 0.8,
        referenceRange: m.reference_range ?? null,
      }));

    if (markers.length === 0) {
      console.warn("[api/parse] zero markers extracted — using demo");
      return Response.json({ ...demoResult(), source: "demo_fallback" });
    }

    return Response.json({
      markers,
      testDate: parsed.test_date || null,
      labName: parsed.lab_name || null,
      parseConfidence: parsed.parse_confidence || "medium",
      source: "openrouter",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[api/parse] falling back to demo —", detail);
    // Graceful degradation: if the OpenRouter call fails (rate limit, billing,
    // dead model, network), return the deterministic demo result so the loop
    // keeps working. The demo data is the user's own real PharmEasy values.
    return Response.json({
      ...demoResult(),
      source: "demo_fallback",
      fallbackReason: detail.slice(0, 200),
    });
  }
}
