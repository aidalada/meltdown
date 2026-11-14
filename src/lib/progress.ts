import { TECHNIQUE_BY_TAG } from "./data";
import type { Session, TechniqueTag } from "./types";

/** "YYYY-MM-DD" in the device's local time zone. */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Consecutive days with a rehearsal, ending today or yesterday (SPEC 14.7). */
export function streakDays(sessions: Pick<Session, "createdAt" | "turns">[], today: Date): number {
  const days = new Set(sessions.filter((s) => s.turns.length > 0).map((s) => localDate(new Date(s.createdAt))));
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDate(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export interface First30 { rehearsals: number; calmReached: number; bestPhrases: string[] }

/** Numbers for the pricing "Your first 30 days" block. Best phrases: biggest positive deltas, no negative tags. */
export function first30Stats(sessions: Session[]): First30 {
  const practiced = sessions.filter((s) => s.turns.length > 0);
  const phrases = practiced
    .flatMap((s) => s.turns)
    .filter((t) => t.delta > 0 && t.tags.every((g) => TECHNIQUE_BY_TAG[g.tag].polarity === "positive"))
    .sort((a, b) => b.delta - a.delta)
    .map((t) => t.parentText);
  return {
    rehearsals: practiced.length,
    calmReached: practiced.filter((s) => s.outcome === "calm_reached").length,
    bestPhrases: [...new Set(phrases)].slice(0, 3),
  };
}

export type Skill = "empathy" | "boundaries" | "control" | "choices";
export const SKILLS: readonly Skill[] = ["control", "boundaries", "choices", "empathy"];

/**
 * Which techniques show each core skill. "plus" tags build the skill, "minus" tags work against it.
 * Emotional control has no technique of its own: every turn without a harsh tag counts as a calm one.
 */
const SKILL_TAGS: Record<Skill, { plus: readonly TechniqueTag[]; minus: readonly TechniqueTag[] }> = {
  empathy: { plus: ["name_feeling", "connect_first", "labeled_praise"], minus: ["dismiss_feeling", "why_question"] },
  boundaries: { plus: ["calm_limit", "when_then"], minus: ["threat", "bribe"] },
  control: { plus: [], minus: ["yell_or_insult", "lecture", "threat"] },
  choices: { plus: ["offer_choice", "playful"], minus: ["threat", "bribe"] },
};

/**
 * Core parenting skills, 0 to 100, from the techniques in the parent's rehearsals.
 * score = 100 x good / (good + 2 x harmful + 2), counted in turns. The "+ 2" means a skill starts
 * at 0 and grows with practice (2 good turns = 50, 6 = 75), and a harmful turn costs twice a good one.
 * Deterministic, like the calm level: the same rehearsals always give the same scores.
 */
export function skillScores(sessions: Pick<Session, "turns">[]): Record<Skill, number> {
  const turns = sessions.flatMap((s) => s.turns);
  const score = (skill: Skill): number => {
    const { plus, minus } = SKILL_TAGS[skill];
    const has = (tags: readonly TechniqueTag[]) => turns.filter((t) => t.tags.some((g) => tags.includes(g.tag))).length;
    const harmful = has(minus);
    const good = skill === "control" ? turns.length - harmful : has(plus);
    return Math.round((100 * good) / (good + 2 * harmful + 2));
  };
  return { empathy: score("empathy"), boundaries: score("boundaries"), control: score("control"), choices: score("choices") };
}
