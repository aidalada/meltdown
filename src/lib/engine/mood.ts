import { TECHNIQUE_BY_TAG } from "@/lib/data";
import {
  HARD_POSITIVE_MULT, LOW_MOOD_POSITIVE_MULT, LOW_MOOD_THRESHOLD,
  MAX_DOWN, MAX_UP, NO_TAG_DELTA, REPEAT_POSITIVE_MULT,
} from "@/lib/constants";
import type { AppliedTag, Difficulty, MoodBand, TagHit, TechniqueTag } from "@/lib/types";

export const BANDS: readonly MoodBand[] = ["meltdown", "upset", "grumpy", "warming", "calm"];

export function bandOf(mood: number): MoodBand {
  if (mood <= 20) return "meltdown";
  if (mood <= 40) return "upset";
  if (mood <= 60) return "grumpy";
  if (mood <= 79) return "warming";
  return "calm";
}

export function bandIndex(band: MoodBand): number {
  return BANDS.indexOf(band);
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export interface ApplyTurnInput {
  moodBefore: number;
  tags: TagHit[];
  prevTags: TechniqueTag[];
  difficulty: Difficulty;
}

export interface ApplyTurnOutput {
  applied: AppliedTag[];
  rawDelta: number;
  moodAfter: number;
  delta: number;
}

export function applyTurn(input: ApplyTurnInput): ApplyTurnOutput {
  const { moodBefore, tags, prevTags, difficulty } = input;
  const seen = new Set<TechniqueTag>();
  const unique: TagHit[] = [];
  for (const t of tags) {
    if (!seen.has(t.tag)) {
      seen.add(t.tag);
      unique.push(t);
    }
  }

  const applied: AppliedTag[] = unique.map((t) => {
    const weight = TECHNIQUE_BY_TAG[t.tag].weight;
    if (weight <= 0) return { ...t, weight, applied: weight };
    let m = 1;
    if (prevTags.includes(t.tag)) m *= REPEAT_POSITIVE_MULT;
    if (moodBefore < LOW_MOOD_THRESHOLD) m *= LOW_MOOD_POSITIVE_MULT;
    if (difficulty === "hard") m *= HARD_POSITIVE_MULT;
    return { ...t, weight, applied: Math.round(weight * m) };
  });

  const rawDelta =
    applied.length === 0
      ? NO_TAG_DELTA
      : clamp(applied.reduce((sum, a) => sum + a.applied, 0), MAX_DOWN, MAX_UP);
  const moodAfter = clamp(moodBefore + rawDelta, 0, 100);
  return { applied, rawDelta, moodAfter, delta: moodAfter - moodBefore };
}
