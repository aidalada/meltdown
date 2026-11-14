import { copy } from "@/content/copy";
import type { CoachMemory, CoachMessage, CoachReply } from "@/types/coach";
import { MAX_SCENARIO_TEXT } from "./constants";
import { PRESETS, TECHNIQUE_BY_TAG } from "./data";
import { heuristicTags } from "./engine/heuristics";
import { localDate } from "./progress";
import { detectSafety } from "./safety";
import type { Checkin, SavedPlan } from "./storage";
import type { NegativeTag, PositiveTag, Profile, Session, TechniqueTag } from "./types";

/*
 * Sebastian, the local coach. Until the team ships /api/coach this file answers on the
 * device: the same tag patterns as the rehearsal engine find what the parent said, and every
 * explanation and source comes from techniques.json (CLAUDE.md rule 6). When the API exists,
 * this stays as its offline and fallback path.
 */

const NEGATIVE: readonly TechniqueTag[] = ["threat", "yell_or_insult", "lecture", "dismiss_feeling", "why_question", "bribe"];
const isNegative = (tag: TechniqueTag): tag is NegativeTag => NEGATIVE.includes(tag);

/**
 * Common moments, the technique that usually helps most, and the preset whose plan phrases give an
 * example that fits the moment (techniques.json has one example per technique, about toothbrushes).
 */
// Order matters: in "no iPad if you don't brush", the iPad is the threat, the moment is teeth.
const TOPICS: { pattern: RegExp; technique: PositiveTag; preset: string }[] = [
  { pattern: /\b(teeth|tooth|brush\w*|bedtime|pajamas?|bath)\b/i, technique: "when_then", preset: "teeth-bedtime" },
  { pattern: /\b(park|playground|slide|swings?|leav(e|ing)|go home|car seat)\b/i, technique: "offer_choice", preset: "leaving-playground" },
  { pattern: /\b(ipad|tablet|screens?|tv|phone|games?|youtube)\b/i, technique: "when_then", preset: "screen-time-off" },
  { pattern: /\b(dress(ed|ing)?|clothes|shirt|shoes|socks|daycare|preschool)\b/i, technique: "playful", preset: "getting-dressed" },
  { pattern: /\b(toys?|share|sharing|sister|brother|siblings?|grab\w*)\b/i, technique: "calm_limit", preset: "sibling-fight" },
  { pattern: /\b(homework|math|reading|spelling)\b/i, technique: "connect_first", preset: "homework-meltdown" },
];
/**
 * The engine's patterns match what a parent says to the child ("no iPad tomorrow!"). With Sebastian,
 * parents describe what they did ("I end up threatening…"). First person only, so "he screamed"
 * about the child does not count as the parent yelling.
 */
const I_DID = String.raw`\bI(?:'m| am| was)?(?:\s+\w+){0,3}\s+`;
const DESCRIBED: { tag: NegativeTag; pattern: RegExp }[] = [
  { tag: "threat", pattern: new RegExp(`${I_DID}(threaten\\w*|take (?:the |his |her |their )?(?:ipad|tablet|phone|tv|toys?) away)`, "i") },
  { tag: "yell_or_insult", pattern: new RegExp(`${I_DID}(yell\\w*|shout\\w*|scream\\w* at|snap\\w* at|los[et] my temper)`, "i") },
  { tag: "bribe", pattern: new RegExp(`${I_DID}(brib\\w*|promis\\w* (?:him|her|them) (?:candy|a treat|a toy|ice cream|chocolate))`, "i") },
  { tag: "lecture", pattern: new RegExp(`${I_DID}(lectur\\w*)`, "i") },
  { tag: "dismiss_feeling", pattern: new RegExp(`${I_DID}((?:told|tell) (?:him|her|them) to (?:stop crying|calm down|get over it))`, "i") },
  { tag: "why_question", pattern: new RegExp(`${I_DID}(ask\\w* (?:him|her|them) why)`, "i") },
];

/** Order to fall back through when the parent already used the suggested technique. */
const FALLBACKS: PositiveTag[] = ["name_feeling", "offer_choice", "when_then", "connect_first", "playful"];

export interface MemoryInput {
  profile: Profile | null;
  /** Newest first, as listSessions returns them. */
  sessions: Session[];
  plan: SavedPlan | null;
  checkins: Checkin[];
}

/** What Sebastian remembers, built only from records already in this browser. */
export function buildMemory({ profile, sessions, plan, checkins }: MemoryInput): CoachMemory {
  const practiced = sessions.filter((s) => s.turns.length > 0);
  const counts = new Map<NegativeTag, number>();
  for (const session of practiced) {
    for (const turn of session.turns) {
      for (const { tag } of turn.tags) if (isNegative(tag)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  let struggle: NegativeTag | null = null;
  for (const [tag, n] of counts) if (!struggle || n > (counts.get(struggle) ?? 0)) struggle = tag;

  const last = practiced[0] ?? null;
  const source = profile ?? (last ? { childName: last.scenario.childName, ageYears: last.scenario.ageYears, temperament: last.scenario.temperament } : null);
  const firstPhrase = plan?.phrases[0];
  return {
    child: source ? { name: source.childName, ageYears: source.ageYears, temperament: source.temperament } : null,
    rehearsals: practiced.length,
    calmReached: practiced.filter((s) => s.outcome === "calm_reached").length,
    lastSession: last ? { title: last.scenario.title, outcome: last.outcome } : null,
    plan: plan && firstPhrase ? { sessionId: plan.sessionId, phrase: firstPhrase.phrase, createdAt: plan.createdAt } : null,
    planCheckedIn: plan ? checkins.some((c) => c.sessionId === plan.sessionId) : false,
    struggle,
  };
}

/** Sebastian's opening for today. The very first visit starts by saying he is an AI. */
export function coachGreeting(memory: CoachMemory, firstVisit: boolean, now: Date): CoachMessage[] {
  const at = now.toISOString();
  const messages: CoachMessage[] = firstVisit ? [{ role: "coach", at, lines: [copy.coach.disclosure] }] : [];
  const child = memory.child?.name ?? copy.coach.yourChild;
  const { plan } = memory;
  if (plan && !memory.planCheckedIn && localDate(new Date(plan.createdAt)) < localDate(now)) {
    messages.push({ role: "coach", at, lines: [copy.coach.greetCheckin(child, plan.phrase)], checkin: plan.sessionId });
  } else if (plan && !memory.planCheckedIn) {
    messages.push({ role: "coach", at, lines: [copy.coach.greetPlanToday(plan.phrase)] });
  } else if (memory.lastSession) {
    messages.push({ role: "coach", at, lines: [copy.coach.greetBack(memory.lastSession.title)] });
  } else {
    messages.push({ role: "coach", at, lines: [copy.coach.greetFirst] });
  }
  return messages;
}

/** Sebastian's answer to the morning check-in. */
export function checkinReply(result: Checkin["result"], now: Date): CoachMessage {
  return { role: "coach", at: now.toISOString(), lines: [copy.coach.checkinReply[result]] };
}

function suggest(negative: NegativeTag | undefined, used: PositiveTag[], topic: PositiveTag): PositiveTag {
  if (negative) {
    const better = TECHNIQUE_BY_TAG[negative].betterWith;
    const pick = better.includes(topic) ? topic : better[0];
    if (pick && !used.includes(pick)) return pick;
  } else if (!used.includes(topic)) {
    return topic;
  }
  return FALLBACKS.find((tag) => !used.includes(tag)) ?? "name_feeling";
}

/** Sebastian's reply to what the parent wrote. Deterministic: the same words get the same answer. */
export function coachReply(text: string, memory: CoachMemory, now: Date): CoachReply {
  const at = now.toISOString();
  const safety = detectSafety(text);
  if (safety !== "none") return { kind: "safety", safety, message: { role: "coach", at, lines: [copy.coach.safetyLine] } };

  const said = text.trim();
  if (said.length < 25) return { kind: "message", message: { role: "coach", at, lines: [copy.coach.tooShort] } };

  const hits = heuristicTags(said);
  const spoken = hits.find((h) => isNegative(h.tag));
  const described = spoken ? undefined : DESCRIBED.find((d) => d.pattern.test(said));
  const negative = spoken && isNegative(spoken.tag) ? spoken.tag : described?.tag;
  const used = hits.map((h) => h.tag).filter((tag): tag is PositiveTag => !isNegative(tag));
  const topic = TOPICS.find((t) => t.pattern.test(said));
  const technique = suggest(negative, used, topic?.technique ?? "name_feeling");
  const tip = TECHNIQUE_BY_TAG[technique];
  const fitting = PRESETS.find((p) => p.id === topic?.preset)?.planPhrases?.find((p) => p.technique === technique)?.phrase;

  const lines: string[] = [copy.coach.empathy[said.length % copy.coach.empathy.length]];
  if (negative) {
    lines.push(spoken ? copy.coach.noticed(spoken.evidence, copy.coach.negNote[negative]) : copy.coach.noticedPlain[negative]);
    if (memory.struggle === negative) lines.push(copy.coach.again);
  } else if (used.length > 0) {
    lines.push(copy.coach.praised(copy.coach.posDone[used[0]]));
  }
  lines.push(`${copy.coach.tryThis(tip.shortTip)} ${tip.why}`);
  const example = fitting ?? (topic ? null : tip.goodExample);
  if (example) lines.push(copy.coach.example(example));
  lines.push(copy.coach.offer(memory.child?.name ?? copy.coach.childFallback));
  return { kind: "message", message: { role: "coach", at, lines, technique, rehearse: said.slice(0, MAX_SCENARIO_TEXT) } };
}

const icsText = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`);

/** A daily 7 pm calendar reminder (iCalendar). Floating local time, so it follows the phone's time zone. */
export function reminderIcs(url: string, now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meltdown//Sebastian reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:meltdown-sebastian-${day}@meltdown`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${day}T190000`,
    "DURATION:PT5M",
    "RRULE:FREQ=DAILY",
    `SUMMARY:${icsText(copy.coach.reminderTitle)}`,
    `DESCRIPTION:${icsText(`${copy.coach.reminderBody} ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(copy.coach.reminderTitle)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
