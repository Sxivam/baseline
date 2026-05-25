"use client";

// /intake — adaptive diagnostic questions before the plan reveal.
// Set of questions depends on which markers need attention + the user's
// profile (lib/intake.ts buildIntake). Answers persist in the store; on
// submit, route to /plan which generates + reveals.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline, useHydrated } from "@/lib/store";
import { buildIntake, isIntakeComplete, type IntakeQuestion } from "@/lib/intake";
import { Disclaimer, Icon, Wordmark } from "@/components/ui";
import type { IntakeAnswers } from "@/lib/types";

export default function IntakePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useBaseline((s) => s.profile);
  const parse = useBaseline((s) => s.parse);
  const intake = useBaseline((s) => s.intake);
  const setIntake = useBaseline((s) => s.setIntake);

  const [answers, setAnswers] = useState<IntakeAnswers>({});

  useEffect(() => {
    if (!hydrated) return;
    if (!profile) router.replace("/start");
    else if (!parse) router.replace("/upload");
    else if (intake) setAnswers(intake);
  }, [hydrated, profile, parse, intake, router]);

  const questions = useMemo<IntakeQuestion[]>(() => {
    if (!profile || !parse) return [];
    return buildIntake(profile, parse.markers);
  }, [profile, parse]);

  if (!hydrated || !profile || !parse) {
    return <Splash />;
  }

  const total = questions.length;
  const answered = questions.filter((q) => {
    const v = (answers as Record<string, unknown>)[q.key];
    if (q.kind === "multi") return Array.isArray(v) && v.length > 0;
    return v !== undefined && v !== null && v !== "";
  }).length;
  const ready = isIntakeComplete(questions, answers);
  const progress = total ? Math.round((answered / total) * 100) : 0;

  function submit() {
    if (!ready) return;
    setIntake(answers);
    router.push("/plan");
  }

  function update<K extends keyof IntakeAnswers>(
    key: K,
    value: IntakeAnswers[K],
  ) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  return (
    <main style={{ minHeight: "100vh", background: tok.paper }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "rgba(238,235,227,.9)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${tok.sageSoft}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/upload")}
            aria-label="Back"
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
            <div className="hi-label">A few questions</div>
            <div
              style={{
                fontFamily: tok.font,
                fontSize: 14,
                fontWeight: 800,
                color: tok.ink,
              }}
            >
              {answered}/{total}
            </div>
          </div>
          <Wordmark size={15} />
        </div>
        <div
          style={{
            height: 3,
            background: tok.sageSoft,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progress}%`,
              background: tok.red,
              transition: "width .25s ease",
            }}
          />
        </div>
      </header>

      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "26px 16px 120px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
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
            Tell us a bit more
            <span style={{ color: tok.red }}>.</span>
          </h1>
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 15,
              fontWeight: 500,
              color: tok.ink2,
              margin: "10px 0 0",
              lineHeight: 1.55,
            }}
          >
            Quick context so the plan we build is actually yours — not a
            generic checklist. {total} questions, takes about 90 seconds.
          </p>
        </section>

        {questions.map((q, i) => (
          <QuestionCard
            key={q.key}
            index={i + 1}
            question={q}
            value={(answers as Record<string, unknown>)[q.key]}
            onChange={(v) => update(q.key, v as IntakeAnswers[typeof q.key])}
          />
        ))}

        <Disclaimer compact style={{ justifyContent: "center", marginTop: 6 }} />
      </div>

      {/* sticky CTA */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "14px 16px 18px",
          background:
            "linear-gradient(180deg, rgba(238,235,227,0) 0%, rgba(238,235,227,1) 50%)",
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          style={{
            pointerEvents: "auto",
            padding: "16px 28px",
            borderRadius: 999,
            border: "none",
            background: ready ? tok.red : tok.sageSoft,
            color: ready ? tok.white : tok.mute,
            fontFamily: tok.font,
            fontWeight: 800,
            fontSize: 15,
            cursor: ready ? "pointer" : "default",
            boxShadow: ready ? tok.shadowRed : "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minWidth: 260,
            justifyContent: "center",
            transition: "background .2s, color .2s",
          }}
        >
          {ready ? "Build my plan →" : `Answer ${total - answered} more`}
        </button>
      </div>
    </main>
  );
}

// ─── One question, type-aware ───────────────────────────────────────────────

function QuestionCard({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: IntakeQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <article
      style={{
        background: tok.white,
        border: `1px solid ${tok.sageSoft}`,
        borderRadius: 24,
        padding: 20,
        boxShadow: tok.shadowSm,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: tok.font,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: tok.mute,
            textTransform: "uppercase",
          }}
        >
          Q{index}
        </div>
        <h2
          style={{
            fontFamily: tok.font,
            fontSize: 18,
            fontWeight: 900,
            color: tok.ink,
            margin: "4px 0 0",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          {question.prompt}
        </h2>
        {question.hint && (
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 12,
              fontWeight: 500,
              color: tok.mute,
              margin: "4px 0 0",
              lineHeight: 1.45,
            }}
          >
            {question.hint}
          </p>
        )}
      </div>

      {question.kind === "scale" && (
        <ScaleRow
          min={question.min ?? 1}
          max={question.max ?? 10}
          unit={question.unit}
          value={typeof value === "number" ? value : undefined}
          onChange={(v) => onChange(v)}
        />
      )}
      {question.kind === "single" && (
        <PillRow
          choices={question.choices ?? []}
          selected={typeof value === "string" ? value : undefined}
          onSelect={(v) => onChange(v)}
        />
      )}
      {question.kind === "multi" && (
        <PillRow
          multi
          choices={question.choices ?? []}
          selectedMulti={Array.isArray(value) ? (value as string[]) : []}
          onSelect={(v) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const next = arr.includes(v)
              ? arr.filter((x) => x !== v)
              : [...arr, v];
            onChange(next);
          }}
        />
      )}
    </article>
  );
}

function ScaleRow({
  min,
  max,
  unit,
  value,
  onChange,
}: {
  min: number;
  max: number;
  unit?: string;
  value?: number;
  onChange: (v: number) => void;
}) {
  const items: number[] = [];
  for (let i = min; i <= max; i++) items.push(i);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              minWidth: 44,
              padding: "10px 14px",
              borderRadius: 99,
              border: `1px solid ${active ? tok.ink : tok.sage}`,
              background: active ? tok.ink : tok.white,
              color: active ? tok.white : tok.ink,
              fontFamily: tok.font,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              transition: "background .15s, color .15s",
            }}
          >
            {n}
            {unit && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  opacity: 0.6,
                  marginLeft: 2,
                }}
              >
                {unit}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PillRow({
  choices,
  selected,
  selectedMulti,
  multi = false,
  onSelect,
}: {
  choices: { value: string; label: string }[];
  selected?: string;
  selectedMulti?: string[];
  multi?: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {choices.map((c) => {
        const active = multi
          ? (selectedMulti ?? []).includes(c.value)
          : selected === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onSelect(c.value)}
            style={{
              padding: "11px 18px",
              borderRadius: 99,
              border: `1px solid ${active ? tok.ink : tok.sage}`,
              background: active ? tok.ink : tok.white,
              color: active ? tok.white : tok.ink,
              fontFamily: tok.font,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              transition: "background .15s, color .15s",
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
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
