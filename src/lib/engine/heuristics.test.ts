import { expect, it } from "vitest";
import cases from "../../data/eval-cases.json";
import { PRESETS } from "../data";
import { EvalCasesFileSchema, TurnModelOutputSchema, TurnResultSchema } from "../schemas";
import type { TurnRequest } from "../types";
import { heuristicTurnOutput } from "./heuristics";
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
