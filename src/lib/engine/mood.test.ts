import { expect, it } from "vitest";
import type { Difficulty, TechniqueTag } from "../types";
import { applyTurn, bandOf } from "./mood";

const rows: [number, TechniqueTag[], TechniqueTag[], Difficulty, number][] = [
  [30, ["name_feeling"], [], "normal", 42],
  [29, ["name_feeling"], [], "normal", 35],
  [50, ["name_feeling", "offer_choice"], [], "normal", 65],
  [50, ["threat"], [], "normal", 35],
  [50, ["threat", "yell_or_insult"], [], "normal", 25],
  [40, [], [], "normal", 38],
  [60, ["name_feeling"], ["name_feeling"], "normal", 66],
  [10, ["threat"], [], "normal", 0],
  [70, ["name_feeling", "threat"], [], "normal", 67],
  [50, ["offer_choice"], [], "hard", 56],
  [75, ["calm_limit"], [], "normal", 80],
  [20, ["name_feeling", "connect_first"], [], "normal", 30],
  [50, ["name_feeling", "name_feeling"], [], "normal", 62],
];

it.each(rows)("starting at %i with %j after %j in %s yields %i", (moodBefore, tags, prevTags, difficulty, expected) => {
  expect(applyTurn({ moodBefore, tags: tags.map((tag) => ({ tag, evidence: "" })), prevTags, difficulty }).moodAfter).toBe(expected);
});

it.each([
  [20, "meltdown"], [21, "upset"], [40, "upset"], [41, "grumpy"],
  [60, "grumpy"], [61, "warming"], [79, "warming"], [80, "calm"],
] as const)("maps mood %i to %s", (mood, band) => {
  expect(bandOf(mood)).toBe(band);
});
