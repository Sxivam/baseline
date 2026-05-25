"use client";

// /improve — personalised lifestyle pathway.
// Cross-marker analysis: takes the user's markers + profile, asks the LLM (or
// the static fallback) for 3-5 concrete behavioural moves, sorted by leverage.
// §7-gated: no doses, no diagnoses, behavioural only.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { MARKERS } from "@/lib/markers";
import { computeStatus } from "@/lib/status";
import { buildLifestyleInput, staticLifestyle } from "@/lib/lifestyle";
import type { LifestylePayload } from "@/lib/lifestyle";
import { Disclaimer, Icon, StatusChip, Wordmark } from "@/components/ui";

export default function ImprovePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const parse = useBaseline((s) => s.parse);

  const [payload, setPayload] = useState<LifestylePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile) {
      router.replace("/start");
      return;
    }
    if (!parse) {
      router.replace("/upload");
      return;
    }
    if (started.current) return;
    started.current = true;

    const input = buildLifestyleInput(profile, parse.markers);

    // Show the static fallback immediately so the page never feels empty.
    setPayload(staticLifestyle(input));
    setLoading(false);

    // Then upgrade to the LLM version when it arrives.
    fetch("/api/recommend-lifestyle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.moves) && data.moves.length > 0) {
          setPayload({
            summary: data.summary,
            moves: data.moves,
            safety_check: data.safety_check,
          });
          setSource(data.source ?? null);
        }
      })
      .catch(() => {
        /* static is already on screen — silent failure is fine */
      });
  }, [hydrated, profile, parse, router]);

  if (!hydrated || !profile || !parse) {
    return <Splash />;
  }

  const attentionMarkers = parse.markers.filter(
    (m) => computeStatus(m.markerId, m.value, profile.sex) !== "in",
  );
  const attentionIds = new Set(attentionMarkers.map((m) => m.markerId));

  return (
    <main style={{ minHeight: "100vh", background: tok.paper }}>
      {/* header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${tok.sageSoft}`,
          background: "rgba(238,235,227,.9)",
          backdropFilter: "blur(8px)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          aria-label="Back to dashboard"
          style={{
            width: 38,
            height: 38,
            borderRadius: 99,
            border: `1px solid ${tok.sageSoft}`,
            background: tok.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <Icon name="arrow" size={15} stroke={tok.ink} strokeWidth={2.2} />
          </span>
        </button>
        <div style={{ textAlign: "center" }}>
          <div className="hi-label">Lifestyle</div>
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 14,
              fontWeight: 800,
              color: tok.ink,
            }}
          >
            {attentionMarkers.length > 0
              ? `${attentionMarkers.length} marker${attentionMarkers.length > 1 ? "s" : ""} to nudge`
              : "Maintenance moves"}
          </div>
        </div>
        <Wordmark size={15} />
      </header>

      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "26px 16px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* hero */}
        <section style={{ padding: "4px 4px 0" }}>
          <h1
            style={{
              fontFamily: tok.font,
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: tok.ink,
              margin: 0,
              lineHeight: 1.12,
            }}
          >
            Things you can do
            <span style={{ color: tok.red }}>.</span>
          </h1>
          {payload?.summary && (
            <p
              style={{
                fontFamily: tok.font,
                fontSize: 15,
                fontWeight: 500,
                color: tok.ink2,
                lineHeight: 1.55,
                margin: "10px 0 0",
              }}
            >
              {payload.summary}
            </p>
          )}
        </section>

        {/* attention chips */}
        {attentionMarkers.length > 0 && (
          <section
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              padding: "0 4px",
            }}
          >
            {attentionMarkers.map((m) => {
              const def = MARKERS[m.markerId];
              const status = computeStatus(m.markerId, m.value, profile.sex);
              return (
                <div
                  key={m.markerId}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 99,
                    background: tok.white,
                    border: `1px solid ${tok.sageSoft}`,
                    fontFamily: tok.font,
                    fontSize: 12,
                    fontWeight: 800,
                    color: tok.ink2,
                  }}
                >
                  <span style={{ color: tok.ink }}>{def?.name}</span>
                  <span style={{ color: tok.mute, fontWeight: 600 }}>
                    {m.value} {def?.unit}
                  </span>
                  <StatusChip kind={status} size={9} />
                </div>
              );
            })}
          </section>
        )}

        {/* moves */}
        {loading || !payload ? (
          <LoadingMoves />
        ) : (
          <section
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {payload.moves.map((move, i) => (
              <MoveCard
                key={move.id}
                index={i + 1}
                move={move}
                isPriority={move.markersHelped.some((id) =>
                  attentionIds.has(id),
                )}
              />
            ))}
          </section>
        )}

        {/* source tag (dev visibility, only when llm) */}
        {source === "llm" && (
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 11,
              fontWeight: 600,
              color: tok.mute,
              textAlign: "center",
              padding: "4px 0",
            }}
          >
            Personalised by an LLM via OpenRouter — §7-gated, behavioural only.
          </div>
        )}

        <Disclaimer />
      </div>
    </main>
  );
}

// ─── Move card ──────────────────────────────────────────────────────────────

function MoveCard({
  index,
  move,
  isPriority,
}: {
  index: number;
  move: { emoji: string; title: string; why: string; action: string; markersHelped: string[] };
  isPriority: boolean;
}) {
  return (
    <article
      style={{
        background: tok.white,
        border: `1px solid ${isPriority ? tok.red : tok.sageSoft}`,
        borderRadius: 24,
        padding: 20,
        boxShadow: tok.shadowSm,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isPriority && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: 99,
            background: "rgba(202,0,19,.08)",
            filter: "blur(20px)",
          }}
        />
      )}

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: isPriority ? tok.red : tok.paper,
              border: `1px solid ${isPriority ? tok.red : tok.sageSoft}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flex: "0 0 auto",
            }}
          >
            {move.emoji}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: tok.font,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: isPriority ? tok.red : tok.mute,
                textTransform: "uppercase",
              }}
            >
              Move {index} {isPriority ? "· highest leverage" : ""}
            </div>
            <h3
              style={{
                fontFamily: tok.font,
                fontSize: 18,
                fontWeight: 900,
                color: tok.ink,
                margin: "2px 0 0",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {move.title}
            </h3>
          </div>
        </div>

        <p
          style={{
            fontFamily: tok.font,
            fontSize: 14,
            fontWeight: 500,
            color: tok.ink2,
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {move.why}
        </p>

        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 16,
            background: tok.paper,
            border: `1px dashed ${tok.sage}80`,
          }}
        >
          <div
            style={{
              fontFamily: tok.font,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: tok.mute,
              textTransform: "uppercase",
            }}
          >
            Do this
          </div>
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 14,
              fontWeight: 600,
              color: tok.ink,
              lineHeight: 1.5,
              margin: "4px 0 0",
            }}
          >
            {move.action}
          </p>
        </div>

        {move.markersHelped.length > 0 && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: tok.font,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.1em",
                color: tok.mute,
                textTransform: "uppercase",
                marginRight: 2,
              }}
            >
              Helps
            </span>
            {move.markersHelped.map((id) => {
              const def = MARKERS[id];
              if (!def) return null;
              return (
                <span
                  key={id}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 99,
                    background: tok.sageMid,
                    fontFamily: tok.font,
                    fontSize: 11,
                    fontWeight: 700,
                    color: tok.ink,
                  }}
                >
                  {def.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

function LoadingMoves() {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            background: tok.white,
            border: `1px solid ${tok.sageSoft}`,
            borderRadius: 24,
            padding: 20,
            height: 180,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg, transparent 0%, ${tok.sageSoft} 50%, transparent 100%)`,
              animation: "bl-shimmer 1.4s linear infinite",
            }}
          />
        </div>
      ))}
    </section>
  );
}

function Splash() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: tok.paper,
      }}
    >
      <Wordmark size={22} />
    </main>
  );
}
