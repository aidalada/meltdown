import { expect, it } from "vitest";
import cases from "../../data/eval-cases.json";
import { PRESETS } from "../data";
import { TurnResultSchema } from "../schemas";
import type { TechniqueTag, TurnModelOutput, TurnRequest } from "../types";
import { heuristicTurnOutput } from "./heuristics";
import { evidenceMatches, pickFallbackLine, replySeed, sanitizeReply } from "./text";
import { finalizeTurn, postProcessTags } from "./turn";

const req: TurnRequest = {
  scenario: PRESETS[0], mood: 30, turnIndex: 0, parentText: "You’re  upset", difficulty: "normal", prevTags: [], history: [],
};
const output: TurnModelOutput = {
  tags: [], safety: "none", replies: { calmer: "Feeling better", same: "Still upset", worse: "Go away" },
};

it.each([
  ["name_feeling", "Feeling better"], ["calm_limit", "Still upset"], ["threat", "Go away"],
] as const)("selects the reply for a %s turn", (tag, reply) => {
  const result = finalizeTurn(req, { ...output, tags: [{ tag, evidence: "YOU'RE upset" }] }, "ai");
  expect(result.turn.childReply).toBe(reply);
  expect(result.turn.parentText).toBe("You're upset");
});

it("removes the speaker prefix and surrounding quotes", () => {
  expect(sanitizeReply('Max: “It’s itchy!”', "school", "upset", 0)).toBe("It's itchy!");
  expect(sanitizeReply('“Child: It is!”', "school", "upset", 0)).toBe("It is!");
});

it("replaces empty and AI replies with the seeded fallback at the new band", () => {
  const expected = pickFallbackLine(req.scenario.ageGroup, "grumpy", replySeed(req.parentText, req.turnIndex));
  for (const calmer of ["I am an AI", "A.I.", 'Child: ""']) {
    expect(finalizeTurn(req, { ...output, tags: [{ tag: "name_feeling", evidence: "upset" }],
      replies: { ...output.replies, calmer } }, "ai").turn.childReply).toBe(expected);
  }
  expect(sanitizeReply("It's not fair!", "preschool", "upset", 2)).toBe("It's not fair!");
  expect(sanitizeReply("Look at A.I.art!", "school", "upset", 0)).toBe("Look at A.I.art!");
});

it.each([["toddler", 14], ["preschool", 14], ["school", 24], ["preteen", 24]] as const)(
  "truncates long replies for %s", (group, limit) => {
    expect(sanitizeReply(Array(30).fill("word").join(" "), group, "grumpy", 1)).toBe(Array(limit).fill("word").join(" ") + "…");
  },
);

it("validates whole evidence words with apostrophes at the 60% boundary", () => {
  expect(evidenceMatches("It's SAD. And fair!", "IT’S sad fair here now")).toBe(true);
  expect(evidenceMatches("it is SAD", "it's sad fair")).toBe(false);
  expect(evidenceMatches("fair", "  !")).toBe(false);
});

it("deduplicates before checking evidence, drops unrelated evidence and caps at four", () => {
  const tags: TechniqueTag[] = ["threat", "threat", "name_feeling", "playful", "when_then", "calm_limit", "offer_choice"];
  const hits = tags.map((tag, i) => ({ tag, evidence: i === 0 ? "elsewhere" : "upset" }));
  expect(postProcessTags(hits, "upset").map((hit) => hit.tag)).toEqual(["name_feeling", "playful", "when_then", "calm_limit"]);
});

it("adds a yelling tag for a shouted reply", () => {
  const result = finalizeTurn({ ...req, parentText: "STOP RIGHT NOW!" }, output, "ai");
  expect(result.turn.tags.map((hit) => hit.tag)).toEqual(["yell_or_insult"]);
});

it("keeps long lecture evidence within the storage and debrief contract", () => {
  const parentText = cases.turnCases.find((item) => item.id === "E13")!.parentText;
  const request = { ...req, parentText };
  for (const out of [output, heuristicTurnOutput(request), { ...output, tags: [{ tag: "lecture" as const, evidence: parentText }] }]) {
    const result = TurnResultSchema.parse(finalizeTurn(request, out, "fallback"));
    expect(result.turn.tags.find((hit) => hit.tag === "lecture")?.evidence.length).toBeLessThanOrEqual(200);
  }
});

it("ends on the turn limit, with calm taking precedence on the last turn", () => {
  const last = { ...req, turnIndex: 7 };
  expect(finalizeTurn(last, output, "fallback").outcome).toBe("turn_limit");
  expect(finalizeTurn({ ...last, mood: 75 }, { ...output, tags: [{ tag: "calm_limit", evidence: "upset" }] }, "ai").outcome).toBe("calm_reached");
});

it("combines local and reported safety", () => {
  const request = { ...req, parentText: "I hit him" };
  expect(finalizeTurn(request, output, "ai").safety).toBe("child_at_risk");
  expect(finalizeTurn(request, { ...output, safety: "parent_crisis" }, "ai").safety).toBe("parent_crisis");
  expect(finalizeTurn({ ...req, parentText: "Don't hit her" }, { ...output, safety: "child_at_risk" }, "ai").safety).toBe("child_at_risk");
});
