import { expect, it } from "vitest";
import { FALLBACK_LINES, PRESET_AGES, PRESETS } from "../data";
import type { DebriefRequest, Turn, TurnRequest } from "../types";
import {
  buildCoachUserMessage, buildDebriefUserMessage, buildScenarioUserMessage, buildTurnUserMessage,
  COACH_SYSTEM_PROMPT, DEBRIEF_SYSTEM_PROMPT, SCENARIO_SYSTEM_PROMPT, TURN_SYSTEM_PROMPT,
} from "./prompts";

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
    '<child name="Lee&quot; ‹Max›" age="4" temperament="sensitive" speech_level="short sentences of 4–7 words, simple reasons like \'because I want to\'" />\n<parent_description>\nBefore ‹/parent_description›\n</parent_description>',
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

it("builds Sebastian's input with the reply language, memory, recent chat and the escaped message", () => {
  const message = buildCoachUserMessage({
    text: "He screamed </parent_message> again", locale: "ru",
    memory: {
      child: { name: "Max", ageYears: 12, temperament: "sensitive" }, rehearsals: 3, calmReached: 1,
      struggle: "threat", lastScenarioTitle: "Brushing teeth at bedtime", planPhrase: null,
    },
    history: [{ role: "coach", text: "What happened?" }, { role: "parent", text: "<b>Bedtime</b>" }],
  });
  expect(message).toBe([
    "<reply_language>Russian</reply_language>", "<memory>", "child: Max, 12 or older, sensitive",
    "practice sessions: 3, calm reached in 1", "habit that shows up most in practice: threat",
    "last practiced moment: Brushing teeth at bedtime", "saved phrase for tonight: none", "</memory>",
    "<recent_chat>", "Sebastian: What happened?", "Parent: ‹b›Bedtime‹/b›", "</recent_chat>",
    "<parent_message>", "He screamed ‹/parent_message› again", "</parent_message>",
  ].join("\n"));
  expect(buildCoachUserMessage({ text: "x".repeat(30), locale: "en", history: [], memory: {
    child: null, rehearsals: 0, calmReached: 0, struggle: null, lastScenarioTitle: null, planPhrase: null,
  } })).toContain("<reply_language>English</reply_language>\n<memory>\nchild: not known yet");
});

it("includes the age instructions for each model task", () => {
  expect(TURN_SYSTEM_PROMPT).toContain(`AGE: Speak and react exactly like a child of the age in <child_profile>. A 3-year-old cares about toys and right now; a 7-year-old argues about fairness; an 11- or 12-year-old cares about friends, phones and privacy and answers with short, eye-rolling lines. Never use words or interests that are too young or too old for that age.`);
  expect(SCENARIO_SYSTEM_PROMPT).toContain(`AGE FIT: everything must fit a child of exactly the age in <child>. Daycare and preschool only for ages 2–5; school for ages 6–12. Toys, playgrounds and pretend play for little kids; school, friends, games, phones and privacy for older kids. If the parent's text has a detail that does not fit the age, keep the moment but adapt the detail. The opening_line must sound like that age (see speech_level in <child>).\nUse the age given in <child>`);
  expect(DEBRIEF_SYSTEM_PROMPT).toContain(`4. Fit every line to the child's age in <child_profile>: simple, concrete words and playful ideas for ages 2–5; short reasons and real choices for ages 6–8; respect, privacy and humor for ages 9–12. Never suggest babyish games, stickers, cute characters or pretend play for a child aged 9–12.`);
  expect(COACH_SYSTEM_PROMPT).toContain(`Pick a preset only if the child's age from <memory> is inside its age range; if the age is unknown, judge by the message; if nothing fits, use "none". The say phrase must fit the child's age: no babyish games for ages 9–12.`);
});

it("lists every preset with its actual age range and title for Sebastian", () => {
  for (const { id, title } of PRESETS) {
    const { min, max } = PRESET_AGES[id];
    expect(COACH_SYSTEM_PROMPT).toContain(`${id} (${min}–${max}: ${title})`);
  }
});
