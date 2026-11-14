import { z } from "zod";
import evalCasesJson from "../data/eval-cases.json";
import fallbackLinesJson from "../data/fallback-lines.json";
import scenariosJson from "../data/scenarios.json";
import techniquesJson from "../data/techniques.json";
import {
  EvalCasesFileSchema, FallbackLinesFileSchema, ScenariosFileSchema, TechniquesFileSchema,
  TechniqueSchema, TechniqueTagSchema, type Preset, type Technique,
} from "./schemas";
import type { AgeGroup, Scenario, TechniqueTag } from "./types";

export function ageGroupOf(age: number): AgeGroup {
  if (age <= 3) return "toddler";
  if (age <= 5) return "preschool";
  if (age <= 8) return "school";
  return "preteen";
}

export const { techniques: TECHNIQUES } = TechniquesFileSchema.parse(techniquesJson);
export const { lines: FALLBACK_LINES } = FallbackLinesFileSchema.parse(fallbackLinesJson);
const { childNames, scenarios } = ScenariosFileSchema.parse(scenariosJson);
EvalCasesFileSchema.parse(evalCasesJson);

export const TECHNIQUE_BY_TAG: Record<TechniqueTag, Technique> = z.record(TechniqueTagSchema, TechniqueSchema).parse(
  Object.fromEntries(TECHNIQUES.map((technique) => [technique.tag, technique])),
);
export const CHILD_NAMES = childNames;
export const PRESETS: Scenario[] = [];
export const PRESET_PRIORITY: Record<string, Preset["priority"]> = {};
for (const { priority, ...scenario } of scenarios) {
  PRESET_PRIORITY[scenario.id] = priority;
  PRESETS.push({ ...scenario, ageGroup: ageGroupOf(scenario.ageYears) });
}
