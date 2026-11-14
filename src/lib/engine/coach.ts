import { textsFor } from "@/content/locale";
import type { CoachMemory } from "@/types/coach";
import { coachReply } from "../coach";
import type { CoachApiReply } from "../coach-client";
import { PRESETS } from "../data";
import { maxSafety } from "../safety";
import type { CoachModelOutput, CoachRequest } from "../schemas";

/*
 * Sebastian on the server (POST /api/coach). The model writes the lead line and picks the technique
 * and a phrase; this file checks and cleans what it returns. The local coach (src/lib/coach.ts) is
 * the fallback (CLAUDE.md rule 7) and runs the safety check before any model call.
 */

const MAX_LEAD = 400;
const MAX_SAY = 160;
/** Shorter messages get the local "tell me a bit more" answer; the model is not called. */
export const MIN_STORY = 25;
const CYRILLIC = /[а-яё]/i;
const QUOTES = /^["'“”‘’«»]+|["'“”‘’«»]+$/g;

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(QUOTES, "").trim();
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, "")}…`;
}

/** The deterministic answer the device would give, in the request's language. */
export function localCoachReply(req: CoachRequest, now: Date): CoachApiReply {
  const memory: CoachMemory = {
    child: req.memory.child,
    rehearsals: req.memory.rehearsals,
    calmReached: req.memory.calmReached,
    lastSession: null,
    plan: null,
    planCheckedIn: false,
    struggle: req.memory.struggle,
  };
  const texts = textsFor(req.locale);
  const reply = coachReply(req.text, memory, now, texts);
  const { message } = reply;
  const lead = clip(message.role === "coach" ? message.lines[0] : texts.copy.coach.safetyLine, MAX_LEAD);
  if (reply.kind === "safety") return { safety: reply.safety, lead, technique: "name_feeling" };
  if (message.role !== "coach") return { safety: "none", lead, technique: "name_feeling" };
  return {
    safety: "none",
    lead,
    technique: message.technique ?? "name_feeling",
    ...(message.say ? { say: message.say } : {}),
    ...(message.preset ? { preset: message.preset } : {}),
  };
}

/** Checks the model's answer. Anything missing, too long or in the wrong language falls back to the local reply. */
export function finalizeCoach(req: CoachRequest, out: CoachModelOutput, local: CoachApiReply): CoachApiReply {
  const safety = maxSafety(local.safety, out.safety);
  if (safety !== "none") return { safety, lead: textsFor(req.locale).copy.coach.safetyLine, technique: "name_feeling" };

  const lead = clip(clean(out.lead), MAX_LEAD);
  const rightLanguage = req.locale === "ru" ? CYRILLIC.test(lead) : !CYRILLIC.test(lead);
  const say = clean(out.say);
  const sayOk = say.length > 0 && say.length <= MAX_SAY && !CYRILLIC.test(say);
  const preset = PRESETS.some((p) => p.id === out.preset) ? out.preset : local.preset;
  return {
    safety: "none",
    lead: lead && rightLanguage ? lead : local.lead,
    technique: out.technique,
    ...(sayOk ? { say } : {}),
    ...(preset ? { preset } : {}),
  };
}
