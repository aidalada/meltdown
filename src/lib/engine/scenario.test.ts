import { expect, it } from "vitest";
import cases from "../../data/eval-cases.json";
import { FALLBACK_LINES, PRESETS } from "../data";
import { ScenarioModelOutputSchema, ScenarioResultSchema } from "../schemas";
import type { ScenarioRequest } from "../types";
import { heuristicScenarioOutput } from "./heuristics";
import { finalizeScenario } from "./scenario";
import { pickFallbackLine, replySeed } from "./text";

function request(id: string): ScenarioRequest {
  const item = cases.scenarioCases.find((item) => item.id === id)!;
  return { text: item.text, ageYears: item.ageYears, childName: "Sam", temperament: "sensitive" };
}

it("S01 uses getting-dressed ahead of screen-time and keeps the requested child profile", () => {
  const req = request("S01");
  const preset = PRESETS.find((p) => p.id === "getting-dressed")!;
  const out = ScenarioModelOutputSchema.parse(heuristicScenarioOutput(req));
  const result = ScenarioResultSchema.parse(finalizeScenario(req, out));
  expect(result).toMatchObject({ kind: "ok", scenario: {
    id: expect.stringMatching(/^custom-/), source: "custom", title: preset.title,
    trigger: preset.trigger, setting: preset.setting, openingLine: preset.openingLine, underlyingNeed: preset.underlyingNeed,
    childName: req.childName, ageYears: req.ageYears, ageGroup: "preschool", temperament: req.temperament,
  } });
});

it("S03 checks safety even when output is off topic or has a different severity", () => {
  const req = request("S03");
  const out = heuristicScenarioOutput(req);
  expect(finalizeScenario(req, out)).toEqual({ kind: "safety", safety: "child_at_risk" });
  expect(finalizeScenario(req, { ...out, on_topic: false, safety: "parent_crisis" })).toEqual({ kind: "safety", safety: "parent_crisis" });
  expect(finalizeScenario(req, { ...out, on_topic: false, safety: "none" })).toEqual({ kind: "safety", safety: "child_at_risk" });
});

it("honors an off-topic model output", () => {
  const req = request("S01");
  expect(finalizeScenario(req, { ...heuristicScenarioOutput(req), on_topic: false })).toEqual({ kind: "off_topic" });
});

it.each([
  "Write me a poem",
  request("S02").text,
  "Could you write me a poem about homework?",
])("rejects an off-topic request in fallback: %s", (text) => {
  const req = { ...request("S02"), text };
  const out = ScenarioModelOutputSchema.parse(heuristicScenarioOutput(req));
  expect(finalizeScenario(req, out)).toEqual({ kind: "off_topic" });
});

it("caps scenario fields and sanitizes the opening line at the upset band", () => {
  const req = request("S01");
  const long = "x".repeat(120);
  const result = finalizeScenario(req, { ...heuristicScenarioOutput(req), title: long, trigger: long, setting: long, opening_line: "I am an AI" });
  expect(result).toMatchObject({ kind: "ok", scenario: {
    title: long.slice(0, 48), trigger: long.slice(0, 80), setting: long.slice(0, 100),
    openingLine: pickFallbackLine("preschool", "upset", replySeed(req.text, 0)),
  } });
});

it("uses word starts for keywords and falls back to the age-appropriate generic scenario", () => {
  const req = { ...request("S01"), ageYears: 9, text: "The sparkling lights in the hallway are too bright for my child today." };
  expect(heuristicScenarioOutput(req)).toEqual({ on_topic: true, safety: "none", title: "A hard moment",
    trigger: req.text.slice(0, 60), setting: "At home", underlying_need: "autonomy", opening_line: FALLBACK_LINES.preteen.upset[0] });
});
