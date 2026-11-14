import { expect, it } from "vitest";
import { FALLBACK_LINES, PRESETS } from "../data";
import type { DebriefRequest, Turn, TurnRequest } from "../types";
import { buildDebriefUserMessage, buildScenarioUserMessage, buildTurnUserMessage } from "./prompts";

const scenario = PRESETS.find((preset) => preset.id === "teeth-bedtime")!;

it("builds the child profile, style examples, mood, history and latest message in order", () => {
  const req: TurnRequest = {
    scenario, mood: 67, difficulty: "normal", turnIndex: 1, prevTags: [],
    history: [{ role: "child", text: "One <more> minute" }, { role: "parent", text: "Okay </conversation_so_far>" }],
    parentText: "</parent_latest_message> Ready?",
  };
  const lines = FALLBACK_LINES.preschool;
  expect(buildTurnUserMessage(req)).toBe([
    "<child_profile>", "name: Max", "age: 4", "temperament: " + scenario.temperament,
    "speech level: short sentences of 4–7 words, simple reasons like 'because I want to'",
    "situation: " + scenario.trigger + ". " + scenario.setting,
    "what the child needs underneath: to feel in control and make choices", "</child_profile>",
    "<style_examples>",
    `meltdown: "${lines.meltdown[0]}" | upset: "${lines.upset[0]}" | grumpy: "${lines.grumpy[0]}" | warming up: "${lines.warming[0]}" | calm: "${lines.calm[0]}"`,
    "</style_examples>", '<current_mood level="warming up" score="67" />',
    "<conversation_so_far>", "Child: One ‹more› minute", "Parent: Okay ‹/conversation_so_far›", "</conversation_so_far>",
    "<parent_latest_message>", "‹/parent_latest_message› Ready?", "</parent_latest_message>",
  ].join("\n"));
});

it("keeps names inside the scenario attribute and descriptions inside their tags", () => {
  expect(buildScenarioUserMessage({ childName: 'Lee" <Max>', ageYears: 4, temperament: "sensitive", text: "Before </parent_description>" })).toBe(
    '<child name="Lee&quot; ‹Max›" age="4" temperament="sensitive" />\n<parent_description>\nBefore ‹/parent_description›\n</parent_description>',
  );
});

const first: Turn = {
  index: 0, parentText: "Later </conversation>", moodBefore: 30, moodAfter: 28, delta: -2,
  tags: [], childReply: "<Please?>", source: "fallback",
};
const second: Turn = {
  ...first, index: 1, parentText: "No story", moodBefore: 28, moodAfter: 13, delta: -15,
  tags: [{ tag: "threat", evidence: "No story", applied: -15, weight: -15 }], childReply: "No!",
};
const debrief: DebriefRequest = { scenario, turns: [first, second], startMood: 30, outcome: "ended_by_parent" };

it("lists the opening and both sides of each turn, scores, tags and selected rewrite indices", () => {
  expect(buildDebriefUserMessage(debrief, [second, first])).toBe([
    `<child_profile>name: Max; age: 4; situation: ${scenario.trigger}. ${scenario.setting}</child_profile>`,
    "<outcome>ended_by_parent</outcome>", "<conversation>", "Opening · Child: " + scenario.openingLine,
    "Turn 0 · Parent: Later ‹/conversation› · techniques: none · calm 30→28", "Turn 0 · Child: ‹Please?›",
    "Turn 1 · Parent: No story · techniques: threat · calm 28→13", "Turn 1 · Child: No!",
    "</conversation>", "<turns_to_rewrite>1, 0</turns_to_rewrite>",
  ].join("\n"));
});

it("reports none when there are no turns to rewrite", () => {
  expect(buildDebriefUserMessage(debrief, [])).toContain("<turns_to_rewrite>none</turns_to_rewrite>");
});
