"use client";

// Onboarding — single page, 5 questions (Age, Sex, Diet, Sun, City) plus a
// name field. Female users see the §7-safe PCOS lifestyle-tracking opt-in.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tok } from "@/lib/tokens";
import { useBaseline } from "@/lib/store";
import type { Diet, Profile, Sex, Sun } from "@/lib/types";
import {
  Blob,
  Button,
  Disclaimer,
  Field,
  Icon,
  SegGroup,
  TextField,
  Wordmark,
} from "@/components/ui";

const DIETS: Diet[] = ["veg", "vegan", "non-veg", "mixed"];
const SUNS: Sun[] = ["indoor", "mixed", "outdoor"];
const SEXES: Sex[] = ["female", "male"];

function OptIn({
  checked,
  onToggle,
  label,
  description,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        textAlign: "left",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: 14,
        borderRadius: 20,
        border: `1px solid ${checked ? tok.red : tok.sageSoft}`,
        background: checked ? tok.redSoft : tok.white,
        cursor: "pointer",
        transition: "border-color .15s, background .15s",
        width: "100%",
      }}
    >
      {/* toggle */}
      <span
        style={{
          flex: "0 0 auto",
          width: 40,
          height: 24,
          borderRadius: 99,
          background: checked ? tok.red : tok.sageMid,
          padding: 3,
          display: "flex",
          justifyContent: checked ? "flex-end" : "flex-start",
          transition: "background .15s",
          marginTop: 2,
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 99,
            background: tok.white,
            boxShadow: tok.shadowSm,
          }}
        />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          className="hi-label"
          style={{ color: checked ? tok.red : tok.mute }}
        >
          {label}
        </span>
        <span
          style={{
            display: "block",
            marginTop: 4,
            fontFamily: tok.font,
            fontSize: 13,
            fontWeight: 500,
            color: tok.ink2,
            lineHeight: 1.45,
          }}
        >
          {description}
        </span>
      </span>
    </button>
  );
}

export default function StartPage() {
  const router = useRouter();
  const setProfile = useBaseline((s) => s.setProfile);

  const [name, setName] = useState("Shivam");
  const [age, setAge] = useState("24");
  const [sex, setSex] = useState<Sex>("male");
  const [diet, setDiet] = useState<Diet>("non-veg");
  const [sun, setSun] = useState<Sun>("indoor");
  const [city, setCity] = useState("Hyderabad");
  const [pcos, setPcos] = useState(false);
  const [trt, setTrt] = useState(false);

  function submit() {
    const profile: Profile = {
      firstName: name.trim() || "there",
      age: Number(age) || 24,
      sex,
      diet,
      sun,
      city: city.trim() || "—",
      pcosTracking: sex === "female" && pcos,
      trtTracking: sex === "male" && trt,
    };
    setProfile(profile);
    router.push("/upload");
  }

  return (
    <main
      className="flex min-h-screen w-full flex-col lg:flex-row"
      style={{ background: tok.paper }}
    >
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col px-6 pt-7 lg:w-[46%] lg:p-14"
        style={{ overflow: "hidden" }}
      >
        <Blob size={260} top={-90} right={-90} color={tok.sageMid} />
        <Blob size={150} bottom={120} left={-50} color={tok.redSoft} />

        <div
          className="flex items-center justify-between"
          style={{ position: "relative", zIndex: 1 }}
        >
          <Wordmark size={20} />
        </div>

        {/* mobile header */}
        <div
          className="lg:hidden"
          style={{ position: "relative", zIndex: 1, marginTop: 22 }}
        >
          <span className="hi-label">Quick setup</span>
          <h1
            style={{
              fontFamily: tok.font,
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              margin: "6px 0 0",
            }}
          >
            Tell us about you.
          </h1>
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 14,
              fontWeight: 500,
              color: tok.ink2,
              lineHeight: 1.5,
              margin: "8px 0 0",
            }}
          >
            30 seconds. We use this to frame your markers — not to email you.
          </p>
        </div>

        {/* desktop hero */}
        <div
          className="hidden lg:flex"
          style={{
            position: "relative",
            zIndex: 1,
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            paddingRight: 24,
          }}
        >
          <span className="hi-label">Quick setup · 30 seconds</span>
          <h1
            style={{
              fontFamily: tok.font,
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              margin: "14px 0 18px",
            }}
          >
            The most honest feedback you can get about your health{" "}
            <span style={{ color: tok.red }}>is a blood test.</span>
          </h1>
          <p
            style={{
              fontFamily: tok.font,
              fontSize: 16,
              fontWeight: 500,
              color: tok.ink2,
              lineHeight: 1.55,
              maxWidth: 460,
            }}
          >
            Tell us a few things so we can frame your markers correctly. We use
            this to nudge you when something&apos;s likely drifting — not to spam
            you.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 28,
            }}
          >
            <div style={{ display: "flex" }}>
              {["#cdb89a", "#a8917a", "#8a6f5b"].map((c, i) => (
                <div
                  key={c}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    background: c,
                    border: `2px solid ${tok.paper}`,
                    marginLeft: i === 0 ? 0 : -8,
                    fontFamily: tok.font,
                    fontSize: 11,
                    fontWeight: 800,
                    color: tok.ink,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {["S", "A", "R"][i]}
                </div>
              ))}
            </div>
            <span
              style={{
                fontFamily: tok.font,
                fontSize: 13,
                fontWeight: 600,
                color: tok.mute,
              }}
            >
              1,247 baselines logged this week.
            </span>
          </div>
        </div>
      </section>

      {/* ── Form ─────────────────────────────────────────────── */}
      <section className="flex flex-1 items-center justify-center px-6 pb-10 pt-6 lg:p-14">
        <div style={{ width: "100%", maxWidth: 468 }}>
          <div
            style={{
              background: tok.white,
              borderRadius: 36,
              border: `1px solid ${tok.sageSoft}`,
              boxShadow: tok.shadow,
              padding: 30,
            }}
          >
            <span className="hi-label">Step 1 of 3</span>
            <h2
              className="hidden lg:block"
              style={{
                fontFamily: tok.font,
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "-0.015em",
                margin: "8px 0 0",
              }}
            >
              Tell us about you.
            </h2>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                marginTop: 20,
              }}
            >
              <Field label="Your name">
                <TextField value={name} onChange={setName} placeholder="Shivam" />
              </Field>

              <Field label="Age">
                <TextField
                  value={age}
                  onChange={(v) => setAge(v.replace(/[^0-9]/g, ""))}
                  placeholder="24"
                  suffix="years"
                  inputMode="numeric"
                />
              </Field>

              <Field label="Sex" hint="refines your reference ranges">
                <SegGroup options={SEXES} value={sex} onChange={setSex} />
              </Field>

              <Field label="Diet" hint="affects B12 & iron">
                <SegGroup options={DIETS} value={diet} onChange={setDiet} size="sm" />
              </Field>

              <Field label="Sun exposure" hint="affects vitamin D">
                <SegGroup options={SUNS} value={sun} onChange={setSun} size="sm" />
              </Field>

              <Field label="City">
                <TextField
                  value={city}
                  onChange={setCity}
                  placeholder="e.g. Bengaluru"
                />
              </Field>

              {sex === "female" && (
                <OptIn
                  checked={pcos}
                  onToggle={() => setPcos((p) => !p)}
                  label="PCOS lifestyle tracking"
                  description="Track cycle regularity and the metabolic markers alongside your baseline. Lifestyle awareness — not a PCOS screen or diagnosis."
                />
              )}
              {sex === "male" && (
                <OptIn
                  checked={trt}
                  onToggle={() => setTrt((p) => !p)}
                  label="HRT / TRT cycle tracking"
                  description="On a prescribed protocol? Log injections, post-shot stages, and watch the lipid + glucose markers move alongside. Tracking only — Baseline never prescribes."
                />
              )}
            </div>

            <Button
              onClick={submit}
              style={{ width: "100%", marginTop: 22, padding: "16px 22px", fontSize: 16 }}
            >
              See my baseline
              <Icon name="arrow" size={16} stroke={tok.white} strokeWidth={2.5} />
            </Button>

            <Disclaimer
              compact
              style={{ justifyContent: "center", marginTop: 14 }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
