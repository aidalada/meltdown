import { expect, it } from "vitest";
import cases from "../../data/eval-cases.json";
import { PRESETS, TECHNIQUES, TECHNIQUE_BY_TAG } from "../data";
import { EvalCasesFileSchema, TurnModelOutputSchema, TurnResultSchema } from "../schemas";
import type { TurnRequest } from "../types";
import { heuristicTags, heuristicTurnOutput } from "./heuristics";
import { finalizeTurn } from "./turn";

it.each(EvalCasesFileSchema.parse(cases).turnCases)("fallback turn $id", (item) => {
  const scenario = PRESETS.find((preset) => preset.id === item.scenarioId);
  if (!scenario) throw new Error("Missing eval preset");
  const req: TurnRequest = {
    scenario, difficulty: "normal", mood: item.mood, turnIndex: 0,
    history: [{ role: "child", text: scenario.openingLine }], parentText: item.parentText, prevTags: [],
  };
  const output = TurnModelOutputSchema.parse(heuristicTurnOutput(req));
  const { turn } = TurnResultSchema.parse(finalizeTurn(req, output, "fallback"));
  const tags = turn.tags.map((hit) => hit.tag);
  for (const tag of item.expectTags) expect(tags).toContain(tag);
  for (const tag of item.forbidTags) expect(tags).not.toContain(tag);
  if (item.replyMustNotMatch) expect(turn.childReply).not.toMatch(new RegExp(item.replyMustNotMatch, "i"));
});

const planPhrases = PRESETS.flatMap((preset) => (preset.planPhrases ?? []).map((p) => [preset.id, p.technique, p.phrase] as const));

it.each(planPhrases)("recognizes the %s plan phrase as %s: %s", (_id, technique, phrase) => {
  const tags = heuristicTags(phrase).map((hit) => hit.tag);
  expect(tags).toContain(technique);
  for (const tag of tags) expect(TECHNIQUE_BY_TAG[tag].polarity).toBe("positive");
});

it.each(TECHNIQUES.filter((t) => t.polarity === "positive").map((t) => [t.tag, t.goodExample] as const))(
  "recognizes the %s example", (tag, example) => {
    expect(heuristicTags(example ?? "").map((hit) => hit.tag)).toContain(tag);
  },
);

it.each([
  ["Do you want the blue toothbrush or the green one?", "name_feeling"],
  ["Are you going to stop or not?", "offer_choice"],
  ["I don't care what you want.", "name_feeling"],
  ["I feel so frustrated with him every night.", "name_feeling"],
] as const)("does not over-tag: %s", (text, tag) => {
  expect(heuristicTags(text).map((hit) => hit.tag)).not.toContain(tag);
});
