import { textsFor, type Texts } from "@/content/locale";
import type { ChildGender, CoachMemory, CoachMessage, CoachReply } from "@/types/coach";
import { MAX_SCENARIO_TEXT } from "./constants";
import { PRESETS, TECHNIQUE_BY_TAG } from "./data";
import { heuristicTags } from "./engine/heuristics";
import { localDate } from "./progress";
import { detectSafety, maxSafety } from "./safety";
import { CHILD_NAMES } from "./data";
import type { Checkin, ChildFacts, SavedPlan } from "./storage";
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
  /** Name and gender facts the parent told Sebastian in the chat. */
  facts?: ChildFacts | null;
}

/** What Sebastian remembers, built only from records already in this browser. */
export function buildMemory({ profile, sessions, plan, checkins, facts }: MemoryInput): CoachMemory {
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
    child: source ? {
      name: source.childName, ageYears: source.ageYears, temperament: source.temperament,
      named: facts?.named ?? false, gender: facts?.gender ?? null,
    } : null,
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
  const child = childLabel(memory, t);
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
  // Parents narrate here. "It's so hard" or "that was frustrating" is about the parent, not the child's
  // feeling named out loud, so name_feeling counts only when the words are addressed to the child.
  const used = hits
    .filter((h) => h.tag !== "name_feeling" || /\byou(r|'re)?\b/i.test(h.evidence))
    .map((h) => h.tag)
    .filter((tag): tag is PositiveTag => !isNegative(tag));
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

/** The child's name when the parent told it, otherwise "your child" in the screen language. */
export function childLabel(memory: CoachMemory, t: Texts = EN): string {
  return memory.child?.named ? memory.child.name : t.copy.coach.yourChild;
}

/*
 * What the parent tells about the child in passing: "my daughter Jessica, she's 7", "дочь Аня, ей 5".
 * Plain patterns, no model: it works offline, and nothing leaves the browser for it.
 */
export interface FoundChild { name?: string; ageYears?: number; gender?: ChildGender }

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
};
const NUM = String.raw`(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen)`;
const AGE_PATTERNS: RegExp[] = [
  new RegExp(String.raw`\b${NUM}[\s-]*(?:years?|yrs?)[\s-]*old\b`, "i"),
  new RegExp(String.raw`\b${NUM}[\s-]*(?:y/o|yo)\b`, "i"),
  new RegExp(String.raw`\b(?:she|he|they)(?:'s| is| are| just turned| turned)\s+${NUM}\b(?![\s-]*(?:minutes?|min|hours?|times?|am|pm|o'clock))`, "i"),
  new RegExp(String.raw`\b(?:my|our)\s+${NUM}[\s-]*(?:year[\s-]*old)\b`, "i"),
  /(\d{1,2})\s*(?:год|года|лет)(?![а-яё])/i,
  /(?:^|[^а-яё])(?:ей|ему|исполнилось)\s+(\d{1,2})(?![\d])/i,
];
const KID_EN = String.raw`(?:daughter|son|girl|boy|kid|child|toddler|little one|baby)`;
const NAME_EN = String.raw`([A-Z][a-z]{1,19})`;
const NAME_PATTERNS_EN: RegExp[] = [
  new RegExp(String.raw`\b(?:her|his|their|my (?:daughter|son|kid|child)'s)\s+name\s+is\s+${NAME_EN}\b`),
  new RegExp(String.raw`\b(?:named|called)\s+${NAME_EN}\b`),
  new RegExp(String.raw`\b(?:[Mm]y|[Oo]ur)\s+(?:\w+[\s-])?${KID_EN},?\s+${NAME_EN}\b`),
  new RegExp(String.raw`\b${NAME_EN}\s+is\s+my\s+${KID_EN}\b`),
];
const NAME_RU = "([А-ЯЁ][а-яё]{1,19})";
const NAME_PATTERNS_RU: RegExp[] = [
  new RegExp(`(?:зовут|имя)\\s+${NAME_RU}`),
  // No "i" flag: the name must start with a capital letter, so "дочь опять…" is not read as a name.
  new RegExp(`(?:^|[^а-яё])(?:[Дд]очь|[Дд]очка|[Дд]оченька|[Дд]очке|[Сс]ын|[Сс]ынок|[Сс]ыну|[Мм]алыш|[Мм]алышка)\\s*,?\\s+${NAME_RU}`),
];
/** Capitalized words that follow "my son" or start a sentence but are not names. */
const NOT_NAMES = new Set([
  "I", "The", "She", "He", "It", "They", "We", "Tonight", "Today", "Yesterday", "This", "That", "When", "After", "Before", "Then",
  "And", "But", "So", "Every", "Always", "Never", "Is", "Was", "Has", "Had", "Just", "Again", "Who", "Refused", "Screamed",
  "Сегодня", "Вчера", "Опять", "Снова", "Она", "Он", "Мы", "Я", "Когда", "Потом", "Который", "Которая",
]);

function toNumber(value: string): number {
  return NUMBER_WORDS[value.toLowerCase()] ?? Number(value);
}

export function extractChild(text: string): FoundChild {
  const found: FoundChild = {};
  for (const pattern of AGE_PATTERNS) {
    const match = pattern.exec(text);
    const n = match ? toNumber(match[1]) : NaN;
    if (Number.isInteger(n) && n >= 1 && n <= 17) {
      found.ageYears = Math.min(12, Math.max(2, n));
      break;
    }
  }
  for (const pattern of [...NAME_PATTERNS_EN, ...NAME_PATTERNS_RU]) {
    const name = pattern.exec(text)?.[1];
    if (name && !NOT_NAMES.has(name)) {
      found.name = name;
      break;
    }
  }
  if (/\bdaughters?\b/i.test(text) || /\b(?:my|our)\s+(?:\w+[\s-])?(?:girl|little girl)\b/i.test(text) || /(?:^|[^а-яё])(?:дочь|дочка|доченька|дочке|дочери|дочку|малышка)(?![а-яё])/i.test(text)) {
    found.gender = "girl";
  } else if (/\bsons?\b/i.test(text) || /\b(?:my|our)\s+(?:\w+[\s-])?(?:boy|little boy)\b/i.test(text) || /(?:^|[^а-яё])(?:сын|сынок|сына|сыну|сыном)(?![а-яё])/i.test(text)) {
    found.gender = "boy";
  }
  return found;
}

const GIRL_NAMES = ["Lily", "Mia", "Ava", "Zoe"];
const BOY_NAMES = ["Max", "Leo", "Sam", "Noah"];

/**
 * Puts what the parent said into the profile. A real name replaces the practice name; a known gender
 * without a name swaps the practice name for one that fits ("Max" becomes "Lily" for a daughter).
 */
export function mergeChildFacts(found: FoundChild, profile: Profile, facts: ChildFacts): { profile: Profile; facts: ChildFacts; changed: boolean } {
  let next = profile;
  let nextFacts = facts;
  if (found.ageYears && found.ageYears !== profile.ageYears) next = { ...next, ageYears: found.ageYears };
  if (found.gender && found.gender !== facts.gender) nextFacts = { ...nextFacts, gender: found.gender };
  if (found.name && (found.name !== profile.childName || !facts.named)) {
    next = { ...next, childName: found.name };
    nextFacts = { ...nextFacts, named: true };
  } else if (!nextFacts.named && nextFacts.gender) {
    const fits = nextFacts.gender === "girl" ? GIRL_NAMES : BOY_NAMES;
    if (!fits.includes(next.childName)) next = { ...next, childName: fits.find((n) => CHILD_NAMES.includes(n)) ?? fits[0] };
  }
  return { profile: next, facts: nextFacts, changed: next !== profile || nextFacts !== facts };
}

const icsText = (s: string) => s.replace(/[\\;,]/g, (ch) => `\\${ch}`);

/** A daily 7 pm calendar reminder (iCalendar). Floating local time, so it follows the phone's time zone. */
/**
 * A daily 7 pm calendar reminder (iCalendar). Floating local time, so it follows the phone's time zone.
 * With memory, the text is Sebastian's own: the child's name, the last moment you talked about, tonight's
 * phrase and the habit you are working on. The calendar keeps the text from the day it was added.
 */
export function reminderIcs(url: string, now: Date, t: Texts = EN, memory?: CoachMemory): string {
  const c = t.copy.coach;
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const title = memory?.child?.named ? c.reminderTitleFor(memory.child.name) : c.reminderTitle;
  const lines: string[] = [];
  if (memory?.lastSession) {
    const moment = t.scenario({ id: memory.lastSession.scenarioId, title: memory.lastSession.title, setting: "" }).title;
    lines.push(c.reminderLast(moment, childLabel(memory, t)));
  }
  if (memory?.plan) lines.push(c.reminderPlan(memory.plan.phrase));
  if (memory?.struggle) lines.push(c.reminderWatch(c.workingOn[memory.struggle]));
  lines.push(c.reminderBody, url);
  const description = lines.map(icsText).join("\\n");
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
    `SUMMARY:${icsText(title)}`,
    `DESCRIPTION:${description}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].map(foldIcs).join("\r\n");
}

/** iCalendar lines longer than 75 bytes are folded: CRLF plus a space (RFC 5545). Counts UTF-8 bytes, so Russian text folds correctly. */
function foldIcs(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const bytes = encoder.encode(ch).length;
    if (size + bytes > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}
