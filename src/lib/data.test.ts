import { describe, expect, it } from "vitest";
import evalCasesJson from "../data/eval-cases.json";
import fallbackLinesJson from "../data/fallback-lines.json";
import scenariosJson from "../data/scenarios.json";
import techniquesJson from "../data/techniques.json";
import { ageGroupOf, CHILD_NAMES, FALLBACK_LINES, PRESETS, PRESET_AGES, PRESET_PRIORITY, presetFitsAge, presetsForAge, TECHNIQUES, TECHNIQUE_BY_TAG } from "./data";
import {
  EvalCasesFileSchema, FallbackLinesFileSchema, ScenariosFileSchema, TechniquesFileSchema,
} from "./schemas";
import type { TechniqueTag } from "./types";

const expectedWeights: Record<TechniqueTag, number> = {
  name_feeling: 12,
  connect_first: 8,
  offer_choice: 8,
  playful: 8,
  when_then: 6,
  labeled_praise: 6,
  calm_limit: 5,
  threat: -15,
  yell_or_insult: -20,
  dismiss_feeling: -10,
  lecture: -8,
  why_question: -5,
  bribe: -3,
};

describe("data files", () => {
  it("parses techniques.json", () => {
    expect(TechniquesFileSchema.parse(techniquesJson)).toEqual(techniquesJson);
  });

  it("parses scenarios.json", () => {
    expect(ScenariosFileSchema.parse(scenariosJson)).toEqual(scenariosJson);
  });

  it("parses fallback-lines.json", () => {
    expect(FallbackLinesFileSchema.parse(fallbackLinesJson).lines).toEqual(FALLBACK_LINES);
  });

  it("parses eval-cases.json", () => {
    expect(EvalCasesFileSchema.parse(evalCasesJson)).toEqual(evalCasesJson);
  });

  it.each([4, 6])("rejects a fallback group with %i lines", (length) => {
    const file = structuredClone(fallbackLinesJson);
    file.lines.preteen.warming = Array<string>(length).fill("Okay");
    expect(FallbackLinesFileSchema.safeParse(file).success).toBe(false);
  });
});

describe("techniques", () => {
  it("has all 13 unique tags at the specified weights", () => {
    expect(TECHNIQUES).toHaveLength(13);
    expect(new Set(TECHNIQUES.map(({ tag }) => tag)).size).toBe(13);
    expect(Object.keys(TECHNIQUE_BY_TAG).sort()).toEqual(Object.keys(expectedWeights).sort());
    for (const technique of TECHNIQUES) {
      expect(technique.weight, technique.tag).toBe(expectedWeights[technique.tag]);
      expect(TECHNIQUE_BY_TAG[technique.tag]).toEqual(technique);
    }
  });

  it("compiles every heuristic pattern as a case-insensitive RegExp", () => {
    for (const { tag, patterns } of TECHNIQUES) {
      for (const pattern of patterns) {
        expect(() => new RegExp(pattern, "i"), tag).not.toThrow();
      }
    }
  });
});

describe("scenarios", () => {
  it("preserves the preset fields and keeps age ranges and picker priority separate", () => {
    const { childNames, scenarios } = ScenariosFileSchema.parse(scenariosJson);
    expect(CHILD_NAMES).toEqual(childNames);
    expect(PRESETS).toHaveLength(scenarios.length);
    for (const [index, { priority, ages, ...scenario }] of scenarios.entries()) {
      expect(PRESET_AGES[scenario.id]).toEqual(ages);
      expect(presetFitsAge(scenario.id, scenario.ageYears)).toBe(true);
      expect(PRESET_PRIORITY[scenario.id]).toBe(priority);
      expect(PRESETS[index]).toEqual({ ...scenario, ageGroup: ageGroupOf(scenario.ageYears) });
    }
  });

  it("offers at least three moments at every age, in priority and file order", () => {
    for (let age = 2; age <= 12; age++) {
      const matches = scenariosJson.scenarios.filter(({ ages }) => ages.min <= age && age <= ages.max);
      const expected = ["P0", "P1"].flatMap((priority) => matches.filter((p) => p.priority === priority));
      const ids = presetsForAge(age).map(({ id }) => id);
      expect(ids.length).toBeGreaterThanOrEqual(3);
      expect(ids).toEqual(expected.map(({ id }) => id));
    }
    expect(presetsForAge(12).map(({ id }) => id)).toEqual([
      "screen-time-off", "homework-meltdown", "school-morning", "phone-bedtime",
    ]);
  });

  it.each([{ min: 1, max: 5 }, { min: 5, max: 13 }, { min: 5, max: 4 }, { min: 2.5, max: 5 }])(
    "rejects an invalid age range $min–$max", (ages) => {
      const scenario = { ...scenariosJson.scenarios[0], ages };
      expect(ScenariosFileSchema.safeParse({ ...scenariosJson, scenarios: [scenario] }).success).toBe(false);
    },
  );

  it("references only positive techniques in preset plans", () => {
    for (const { planPhrases } of ScenariosFileSchema.parse(scenariosJson).scenarios) {
      for (const { technique } of planPhrases) {
        expect(TECHNIQUE_BY_TAG[technique].polarity, technique).toBe("positive");
      }
    }
  });

  it("resolves every eval scenarioId and every expected or forbidden tag", () => {
    const presetIds = new Set(PRESETS.map(({ id }) => id));
    for (const item of EvalCasesFileSchema.parse(evalCasesJson).turnCases) {
      expect(presetIds.has(item.scenarioId), item.id).toBe(true);
      for (const tag of [...item.expectTags, ...item.forbidTags]) {
        expect(TECHNIQUE_BY_TAG[tag]?.tag, item.id).toBe(tag);
      }
    }
  });

  it("resolves every requested coach preset", () => {
    const presetIds = new Set(PRESETS.map(({ id }) => id));
    for (const { id, expectPreset } of EvalCasesFileSchema.parse(evalCasesJson).coachCases) {
      if (expectPreset !== undefined && expectPreset !== "none") {
        expect(presetIds.has(expectPreset), id).toBe(true);
      }
    }
  });

  it.each([
    [2, "toddler"], [3, "toddler"], [4, "preschool"], [5, "preschool"],
    [6, "school"], [8, "school"], [9, "preteen"], [12, "preteen"],
  ] as const)("maps age %i to %s", (age, group) => {
    expect(ageGroupOf(age)).toBe(group);
  });
});
