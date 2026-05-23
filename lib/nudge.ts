// Nudge input builder + the §7-safe static fallback payload.

import { MARKERS } from "./markers";
import { THREE_THINGS } from "./copy";
import { formatDate, softDate } from "./format";
import type { Forecast, NudgePayload, Profile } from "./types";

export interface NudgeInput {
  marker: {
    id: string;
    name: string;
    full_name: string;
    unit: string;
    threshold: number;
    last_value: number;
    last_date: string;
    current_estimate: number;
    projected_value: number;
    projected_date: string;
    already_below: boolean;
  };
  profile: {
    firstName: string;
    age: number;
    sex: string;
    diet: string;
    sun: string;
    city: string;
  };
  nudge_date: string;
  season_context: string;
}

/** Interpolate the projected value at a given moment along the forecast curve. */
function valueAt(forecast: Forecast, when: number): number {
  const pts = forecast.points;
  const ms = (d: string) => new Date(d).getTime();
  if (when <= ms(pts[0].date)) return pts[0].value;
  for (let i = 1; i < pts.length; i++) {
    if (when <= ms(pts[i].date)) {
      const a = pts[i - 1];
      const b = pts[i];
      const f = (when - ms(a.date)) / (ms(b.date) - ms(a.date) || 1);
      return a.value + f * (b.value - a.value);
    }
  }
  return pts[pts.length - 1].value;
}

/** Assemble the structured input for the copy-generation prompt. */
export function buildNudgeInput(
  markerId: string,
  lastValue: number,
  lastDate: string,
  forecast: Forecast,
  profile: Profile,
): NudgeInput {
  const def = MARKERS[markerId];
  const threshold = def.thresholds?.low ?? 0;
  const pts = forecast.points;
  const current = Math.round(valueAt(forecast, Date.now()) * 10) / 10;
  const projectedValue = forecast.crossingDate
    ? threshold
    : Math.round(pts[pts.length - 1].value * 10) / 10;

  const seasonContext =
    markerId === "vitamin_d"
      ? "sunlight fading into the lower-light autumn and winter months"
      : "a plant-leaning diet slowly drawing down B12 stores over months";

  return {
    marker: {
      id: markerId,
      name: def.name,
      full_name: def.fullName,
      unit: def.unit,
      threshold,
      last_value: lastValue,
      last_date: lastDate,
      current_estimate: current,
      projected_value: projectedValue,
      projected_date: forecast.crossingDate
        ? softDate(forecast.crossingDate)
        : "the coming months",
      already_below: forecast.alreadyBelow,
    },
    profile: {
      firstName: profile.firstName,
      age: profile.age,
      sex: profile.sex,
      diet: profile.diet,
      sun: profile.sun,
      city: profile.city,
    },
    nudge_date: forecast.nudgeDate ?? "",
    season_context: seasonContext,
  };
}

/** Deterministic, §7-pre-approved nudge — used when no key is set or the
 *  generated copy fails the safety gate. */
export function staticNudge(input: NudgeInput): NudgePayload {
  const m = input.marker;
  const things = THREE_THINGS[m.id] ?? THREE_THINGS.vitamin_d;
  const datedRetest =
    m.projected_date !== "the coming months"
      ? `by ${m.projected_date}`
      : "in the next few weeks";

  const context = m.already_below
    ? `You tested at ${m.last_value} ${m.unit} on ${formatDate(m.last_date)}. Based on the season, your day, and how ${m.name} typically behaves, you're probably tracking somewhere around ${m.current_estimate} ${m.unit} right now — already under the commonly-cited line of ${m.threshold}.`
    : `You tested at ${m.last_value} ${m.unit} on ${formatDate(m.last_date)}. Based on the season, your day, and how ${m.name} typically behaves, you're probably tracking somewhere around ${m.current_estimate} ${m.unit} right now — and likely to drift under the line of ${m.threshold} around ${m.projected_date}.`;

  return {
    subject: `Your ${m.name} is quietly drifting — re-test ${datedRetest}`,
    hero_line: `Your ${m.name} is\n${m.already_below ? "slowly slipping." : "quietly drifting."}`,
    greeting: `Hey ${input.profile.firstName},`,
    context_paragraph: context,
    projection_intro: "Left alone, here's what we expect:",
    three_things: things,
    question_card: {
      label: "ONE QUESTION",
      text: `Can you re-test ${datedRetest}?`,
    },
    signoff: "Take care of yourself,\n— Baseline.",
    safety_check: "pass",
  };
}
