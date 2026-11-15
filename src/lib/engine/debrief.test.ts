import { expect, it } from "vitest";
import { ageGroupOf, PRESETS, TECHNIQUE_BY_TAG } from "../data";
import { DebriefModelOutputSchema, DebriefSchema } from "../schemas";
import type { DebriefRequest, TechniqueTag, Turn } from "../types";
import { fallbackPlan, finalizeDebrief, turnsToRewrite } from "./debrief";
import { heuristicDebriefOutput } from "./heuristics";

function turn(index: number, before: number, after: number, tags: TechniqueTag[]): Turn {
  return {
    index, moodBefore: before, moodAfter: after, delta: after - before, source: "fallback",
    tags: tags.map((tag) => ({ tag, evidence: "test", weight: TECHNIQUE_BY_TAG[tag].weight, applied: TECHNIQUE_BY_TAG[tag].weight })),
    parentText: "original " + index, childReply: "No!",
  };
}

const req: DebriefRequest = {
  scenario: PRESETS[0], startMood: 50, outcome: "ended_by_parent",
  turns: [turn(0, 50, 62, ["name_feeling"]), turn(1, 62, 47, ["threat"]), turn(2, 47, 45, []),
    turn(3, 45, 25, ["yell_or_insult"]), turn(4, 25, 25, ["connect_first"])],
};

it("ranks the worst eligible deltas and leaves the original order intact", () => {
  expect(turnsToRewrite(req.turns).map((t) => t.index)).toEqual([3, 1, 2]);
  expect(req.turns.map((t) => t.index)).toEqual([0, 1, 2, 3, 4]);
  expect(turnsToRewrite([req.turns[0]])).toEqual([]);
  expect(turnsToRewrite([turn(5, 25, 26, [])])).toHaveLength(1);
});

it("takes originals from eligible turns and computes all stats locally", () => {
  const output = heuristicDebriefOutput(req);
  const first = output.rewrites[0];
  const hostile = [{ ...first, turn_index: 0 }, { ...first, turn_index: 99 }, first, ...output.rewrites];
  const result = finalizeDebrief(req, { ...output, rewrites: hostile }, "ai");
  expect(DebriefSchema.parse(result)).toEqual(result);
  expect(result.rewrites.map((r) => [r.turnIndex, r.original])).toEqual([[3, "original 3"], [1, "original 1"], [2, "original 2"]]);
  expect(result.stats).toEqual({ turns: 5, startMood: 50, endMood: 25, lowMood: 25, peakMood: 62, outcome: "ended_by_parent" });
});

it("rewrites with the scenario's own plan phrase when one fits, else the technique's example", () => {
  const out = DebriefModelOutputSchema.parse(heuristicDebriefOutput(req));
  const plan = req.scenario.planPhrases ?? [];
  const fromPlan = (tag: string) => plan.find((p) => p.technique === tag)?.phrase;
  expect(out.rewrites.map((r) => [r.technique, r.improved])).toEqual([
    ["connect_first", TECHNIQUE_BY_TAG.connect_first.goodExample],
    ["offer_choice", fromPlan("offer_choice")],
    ["name_feeling", fromPlan("name_feeling")],
  ]);
  expect(out.summary).toBe("You stayed with it for 5 turns. Next time, try this: " + TECHNIQUE_BY_TAG.offer_choice.shortTip);
});

it.each([
  [12, "Phone at bedtime", "Won't stop", "Bedroom", "phone-bedtime"],
  [12, "A hard evening", "Won't start math", "Kitchen", "homework-meltdown"],
  [12, "A hard morning", "Won't get going", "The school bus is coming", "school-morning"],
  [12, "Brushing teeth", "Refuses", "Bathroom", "screen-time-off"],
  [4, "Before we go", "Won't put shoes on", "Hallway", "getting-dressed"],
  [4, "A hard moment", "Refuses", "At home", "teeth-bedtime"],
] as const)("selects an age-appropriate plan and rewrite: age %i, %s / %s / %s → %s", (ageYears, title, trigger, setting, id) => {
  const scenario = { ...req.scenario, id: "custom-test", source: "custom" as const,
    ageYears, ageGroup: ageGroupOf(ageYears), title, trigger, setting, planPhrases: undefined };
  const request = { ...req, scenario, turns: [turn(0, 50, 35, ["threat", "lecture"])] };
  const plan = PRESETS.find((p) => p.id === id)!.planPhrases!;
  const out = heuristicDebriefOutput(request);
  const result = finalizeDebrief(request, out, "fallback");
  expect(result.tonightPlan).toEqual(plan);
  expect(result.rewrites).toHaveLength(1);
  expect(result.rewrites[0]).toMatchObject({
    technique: "offer_choice", improved: plan.find((p) => p.technique === "offer_choice")!.phrase,
  });
  if (ageYears === 12) {
    const lines = [...result.tonightPlan.map((p) => p.phrase), ...result.rewrites.map((r) => r.improved)];
    expect(lines.join(" ")).not.toMatch(/toothbrush|teeth|story/i);
  }
});

it("uses the first matching betterWith technique even when it comes last in the plan", () => {
  const scenario = { ...req.scenario, planPhrases: [...req.scenario.planPhrases!].reverse() };
  const request = { ...req, scenario, turns: [turn(0, 50, 35, ["threat"])] };
  const result = heuristicDebriefOutput(request);
  expect(result.tonight_plan).toEqual(scenario.planPhrases);
  expect(result.rewrites[0].technique).toBe("offer_choice");
});

it("uses total applied points for calm and the default label after all four suggestions", () => {
  const turns = [turn(0, 50, 62, ["name_feeling"]), turn(1, 62, 70, ["offer_choice"]),
    turn(2, 70, 84, ["offer_choice", "when_then", "connect_first"])];
  expect(heuristicDebriefOutput({ ...req, turns, outcome: "calm_reached" }).summary)
    .toBe(req.scenario.childName + " calmed down in 3 turns. Offered a choice made the biggest difference.");
  expect(heuristicDebriefOutput({ ...req, turns }).summary)
    .toBe("You stayed with it for 3 turns. Next time, try this: " + TECHNIQUE_BY_TAG.name_feeling.shortTip);
});

it("completes missing or repetitive plans with three different techniques", () => {
  const output = heuristicDebriefOutput(req);
  const phrase = fallbackPlan(req.scenario)[0];
  for (const tonight_plan of [[], [phrase], [phrase, phrase, phrase], [...output.tonight_plan, phrase]]) {
    const { tonightPlan } = finalizeDebrief(req, { ...output, tonight_plan }, "ai");
    expect(tonightPlan).toHaveLength(3);
    expect(new Set(tonightPlan.map((p) => p.technique)).size).toBe(3);
  }
});

it("includes the starting mood for a session with no turns", () => {
  const empty = { ...req, turns: [] };
  const result = finalizeDebrief(empty, heuristicDebriefOutput(empty), "fallback");
  expect(result.stats).toEqual({ turns: 0, startMood: 50, endMood: 50, peakMood: 50, lowMood: 50, outcome: req.outcome });
  expect(result.rewrites).toEqual([]);
});
