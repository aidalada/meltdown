import { textsFor, type Texts } from "@/content/locale";
import type { CoachMemory, CoachMessage, CoachReply } from "@/types/coach";
import { MAX_SCENARIO_TEXT } from "./constants";
import { PRESETS, TECHNIQUE_BY_TAG } from "./data";
import { heuristicTags } from "./engine/heuristics";
import { localDate } from "./progress";
import { detectSafety, maxSafety } from "./safety";
import type { Checkin, SavedPlan } from "./storage";
import type { NegativeTag, PositiveTag, Profile, Safety, Session, TechniqueTag } from "./types";

/*
 * Sebastian, the local coach. Until the team ships /api/coach this file answers on the
 * device: the same tag patterns as the rehearsal engine find what the parent said, and every
 * explanation and source comes from techniques.json (CLAUDE.md rule 6). When the API exists,
 * this stays as its offline and fallback path.
 *
 * Russian input is understood too (the jury demo). JavaScript's \b ignores Cyrillic, so the
 * Russian patterns match word stems and use lookarounds instead.
 */

const EN = textsFor("en");
const NEGATIVE: readonly TechniqueTag[] = ["threat", "yell_or_insult", "lecture", "dismiss_feeling", "why_question", "bribe"];
const isNegative = (tag: TechniqueTag): tag is NegativeTag => NEGATIVE.includes(tag);
const NO_LETTER_BEFORE = "(?<![а-яё])";

/**
 * Common moments, the technique that usually helps most, and the preset whose plan phrases give an
 * example that fits the moment (techniques.json has one example per technique, about toothbrushes).
 * Order matters: in "no iPad if you don't brush", the iPad is the threat, the moment is teeth.
 */
const TOPICS: { en: RegExp; ru: RegExp; technique: PositiveTag; preset: string }[] = [
  { en: /\b(teeth|tooth|brush\w*|bedtime|pajamas?|bath)\b/i, ru: /(зуб|чистк|чистить|укладыв|спать|пижам|купа|ванн)/i, technique: "when_then", preset: "teeth-bedtime" },
  { en: /\b(park|playground|slide|swings?|leav(e|ing)|go home|car seat)\b/i, ru: /(площадк|парк|горк|качел|уход|уйти|домой)/i, technique: "offer_choice", preset: "leaving-playground" },
  { en: /\b(ipad|tablet|screens?|tv|phone|games?|youtube)\b/i, ru: /(планшет|айпад|мульт|телефон|телевизор|компьютер|игр[аеуы](?![а-яё]))/i, technique: "when_then", preset: "screen-time-off" },
  { en: /\b(dress(ed|ing)?|clothes|shirt|shoes|socks|daycare|preschool)\b/i, ru: /(одева|одеть|одежд|куртк|ботинк|обув|носк|садик|детский сад)/i, technique: "playful", preset: "getting-dressed" },
  { en: /\b(toys?|share|sharing|sister|brother|siblings?|grab\w*)\b/i, ru: /(игрушк|сестр|брат|делит|отобрал|отнял)/i, technique: "calm_limit", preset: "sibling-fight" },
  { en: /\b(homework|math|reading|spelling)\b/i, ru: /(урок|домашк|домашн|математ|пропис)/i, technique: "connect_first", preset: "homework-meltdown" },
];

/**
 * The engine's patterns match what a parent says to the child ("no iPad tomorrow!"). With Sebastian,
 * parents describe what they did ("I end up threatening…"). First person only, so "he screamed"
 * about the child does not count as the parent yelling. Russian uses first-person and feminine
 * past forms ("кричу", "накричала"), since a narrating parent mostly writes about themselves.
 */
const I_DID = String.raw`\bI(?:'m| am| was)?(?:\s+\w+){0,3}\s+`;
const DESCRIBED: { tag: NegativeTag; en: RegExp; ru: RegExp }[] = [
  {
    tag: "threat",
    en: new RegExp(`${I_DID}(threaten\\w*|take (?:the |his |her |their )?(?:ipad|tablet|phone|tv|toys?) away)`, "i"),
    ru: /(угрожаю|угрожала|я угрожал|пригрозила|я пригрозил|отберу|заберу|лишу|не получишь|не будет (мульт|планшет|айпад|ipad|сладк|сказк))/i,
  },
  {
    tag: "yell_or_insult",
    en: new RegExp(`${I_DID}(yell\\w*|shout\\w*|scream\\w* at|snap\\w* at|los[et] my temper)`, "i"),
    ru: /(я (на)?кричу|(?<![а-яё])кричу|(на)?кричала|я (на)?кричал|наорала|я наорал|сорвалась|я сорвался|повысила голос|я повысил голос)/i,
  },
  {
    tag: "bribe",
    en: new RegExp(`${I_DID}(brib\\w*|promis\\w* (?:him|her|them) (?:candy|a treat|a toy|ice cream|chocolate))`, "i"),
    ru: /(подкупаю|подкупила|я подкупил|пообещала (конфет|сладк|игрушк|морожен|шоколад)|я пообещал (конфет|сладк|игрушк|морожен|шоколад)|дам (тебе )?конфет)/i,
  },
  { tag: "lecture", en: new RegExp(`${I_DID}(lectur\\w*)`, "i"), ru: /(нотаци|читаю мораль|отчитываю|отчитала|я отчитал)/i },
  {
    tag: "dismiss_feeling",
    en: new RegExp(`${I_DID}((?:told|tell) (?:him|her|them) to (?:stop crying|calm down|get over it))`, "i"),
    ru: /(перестань плакать|хватит ныть|хватит плакать|успокойся|не реви|ничего страшного)/i,
  },
  { tag: "why_question", en: new RegExp(`${I_DID}(ask\\w* (?:him|her|them) why)`, "i"), ru: /(почему ты|зачем ты)/i },
];

/** Russian crisis words. safety.ts (team B) is English-only, so Russian input is checked here as well. */
const CRISIS_RU: { safety: Exclude<Safety, "none">; pattern: RegExp }[] = [
  { safety: "parent_crisis", pattern: /(не хочу жить|покончить с собой|покончу с собой|убить себя|убью себя|суицид|хочу умереть|лучше бы меня не было)/i },
  {
    safety: "child_at_risk",
    pattern: new RegExp(`${NO_LETTER_BEFORE}(?<!не )(ударил[аи]?|избил[аи]?|отлупил[аи]?|трясл[аи]|тряс|бью|била|бил) (его|её|ее|сына|дочь|дочку|ребенка|ребёнка|малыша)`, "i"),
  },
  { safety: "child_at_risk", pattern: /(не дышит|задыхается|без сознания|проглотил[аи]? (таблетк|лекарств|батарейк))/i },
];

function detectSafetyAnyLanguage(text: string): Safety {
  const ru = CRISIS_RU.find((c) => c.pattern.test(text))?.safety ?? "none";
  return maxSafety(detectSafety(text), ru);
}

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
    lastSession: last ? { scenarioId: last.scenario.id, title: last.scenario.title, outcome: last.outcome } : null,
    plan: plan && firstPhrase ? { sessionId: plan.sessionId, phrase: firstPhrase.phrase, createdAt: plan.createdAt } : null,
    planCheckedIn: plan ? checkins.some((c) => c.sessionId === plan.sessionId) : false,
    struggle,
  };
}

/** Sebastian's opening for today. The very first visit starts by saying he is an AI. */
export function coachGreeting(memory: CoachMemory, firstVisit: boolean, now: Date, t: Texts = EN): CoachMessage[] {
  const c = t.copy.coach;
  const at = now.toISOString();
  const messages: CoachMessage[] = firstVisit ? [{ role: "coach", at, lines: [c.disclosure] }] : [];
  const child = memory.child?.name ?? c.yourChild;
  const { plan, lastSession } = memory;
  if (!memory.child) {
    // Nothing is known yet: one tap on an age range, and the first real question follows the answer.
    messages.push({ role: "coach", at, lines: [c.askAge], askAge: true });
  } else if (plan && !memory.planCheckedIn && localDate(new Date(plan.createdAt)) < localDate(now)) {
    messages.push({ role: "coach", at, lines: [c.greetCheckin(child, plan.phrase)], checkin: plan.sessionId });
  } else if (plan && !memory.planCheckedIn) {
    messages.push({ role: "coach", at, lines: [c.greetPlanToday(plan.phrase)] });
  } else if (lastSession) {
    const title = t.scenario({ id: lastSession.scenarioId, title: lastSession.title, setting: "" }).title;
    messages.push({ role: "coach", at, lines: [c.greetBack(title)] });
  } else {
    messages.push({ role: "coach", at, lines: [c.greetFirst] });
  }
  return messages;
}

/** Sebastian's answer once the parent has picked an age range. */
export function ageReply(now: Date, t: Texts = EN): CoachMessage {
  return { role: "coach", at: now.toISOString(), lines: [t.copy.coach.ageThanks, t.copy.coach.greetFirst] };
}

/** Sebastian's answer to the morning check-in. */
export function checkinReply(result: Checkin["result"], now: Date, t: Texts = EN): CoachMessage {
  return { role: "coach", at: now.toISOString(), lines: [t.copy.coach.checkinReply[result]] };
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

/** Sebastian's reply to what the parent wrote (English or Russian). Deterministic: same words, same answer. */
export function coachReply(text: string, memory: CoachMemory, now: Date, t: Texts = EN): CoachReply {
  const c = t.copy.coach;
  const at = now.toISOString();
  const safety = detectSafetyAnyLanguage(text);
  if (safety !== "none") return { kind: "safety", safety, message: { role: "coach", at, lines: [c.safetyLine] } };

  const said = text.trim();
  if (said.length < 25) return { kind: "message", message: { role: "coach", at, lines: [c.tooShort] } };

  const hits = heuristicTags(said);
  const spoken = hits.find((h) => isNegative(h.tag));
  const described = spoken ? undefined : DESCRIBED.find((d) => d.en.test(said) || d.ru.test(said));
  const negative = spoken && isNegative(spoken.tag) ? spoken.tag : described?.tag;
  const used = hits.map((h) => h.tag).filter((tag): tag is PositiveTag => !isNegative(tag));
  const topic = TOPICS.find((x) => x.en.test(said) || x.ru.test(said));
  const technique = suggest(negative, used, topic?.technique ?? "name_feeling");
  const fitting = PRESETS.find((p) => p.id === topic?.preset)?.planPhrases?.find((p) => p.technique === technique)?.phrase;
  const say = fitting ?? (topic ? undefined : TECHNIQUE_BY_TAG[technique].goodExample ?? undefined);

  // One short line up front. The tip, the why and the source sit behind "Why it works" on screen.
  const lead = negative
    ? (spoken ? c.noticed(spoken.evidence, c.negNote[negative]) : c.noticedPlain[negative])
    : used.length > 0 ? c.praised(c.posDone[used[0]]) : c.empathy[said.length % c.empathy.length];
  return {
    kind: "message",
    message: {
      role: "coach", at, lines: [lead], technique, rehearse: said.slice(0, MAX_SCENARIO_TEXT),
      ...(say ? { say } : {}),
      ...(negative && memory.struggle === negative ? { again: true } : {}),
      ...(topic ? { preset: topic.preset } : {}),
    },
  };
}

const icsText = (s: string) => s.replace(/[\\;,]/g, (ch) => `\\${ch}`);

/** A daily 7 pm calendar reminder (iCalendar). Floating local time, so it follows the phone's time zone. */
export function reminderIcs(url: string, now: Date, t: Texts = EN): string {
  const c = t.copy.coach;
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
    `SUMMARY:${icsText(c.reminderTitle)}`,
    `DESCRIPTION:${icsText(`${c.reminderBody} ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(c.reminderTitle)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
