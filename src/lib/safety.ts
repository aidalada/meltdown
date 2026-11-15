import { normalizeText } from "./engine/text";
import type { Safety } from "./types";

const parentCrisis = [
  /\b(kill|hurt|harm)\s+myself\b/i,
  /\bsuicid(e|al)\b/i,
  /\bwant to die\b/i,
  /\bend (it all|my life)\b/i,
  /(не хочу жить|покончить с собой|покончу с собой|убить себя|убью себя|суицид|хочу умереть|лучше бы меня не было)/i,
];
const childHarm = [
  /\b(hit|hitting|beat|beating|punch(ed)?|slap(ped)?|choke(d)?|shake|shaking|shook|smack(ed)?)\s+(him|her|them|my (son|daughter|kid|child|baby|toddler))\b/gi,
  /\b(hurt|kill)\s+(him|her|them|my (son|daughter|kid|child|baby))\b/gi,
];
const immediateDanger = /\b(not breathing|choking|unconscious|seizure|overdose|swallowed (pills|medicine|bleach|a battery))\b/i;
const prohibition = /\b(won't let you|don't|do not)\s+$/i;
const russianChildHarm = /(?<![а-яё])(?<!не )(ударил[аи]?|избил[аи]?|отлупил[аи]?|трясл[аи]|тряс|бью|била|бил) (его|её|ее|сына|дочь|дочку|ребенка|ребёнка|малыша)/i;
const russianImmediateDanger = /(не дышит|задыхается|без сознания|проглотил[аи]? (таблетк|лекарств|батарейк))/i;

export function detectSafety(text: string): Safety {
  const normalized = normalizeText(text);
  if (parentCrisis.some((pattern) => pattern.test(normalized))) return "parent_crisis";
  if (immediateDanger.test(normalized) || russianImmediateDanger.test(normalized) || russianChildHarm.test(normalized)) {
    return "child_at_risk";
  }
  for (const pattern of childHarm) {
    for (const match of normalized.matchAll(pattern)) {
      if (!prohibition.test(normalized.slice(0, match.index))) return "child_at_risk";
    }
  }
  return "none";
}

export function maxSafety(a: Safety, b: Safety): Safety {
  if (a === "parent_crisis" || b === "parent_crisis") return "parent_crisis";
  if (a === "child_at_risk" || b === "child_at_risk") return "child_at_risk";
  return "none";
}
