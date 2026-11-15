import { ageGroupOf, PRESETS, presetFitsAge } from "../data";
import { detectSafety, maxSafety } from "../safety";
import type { ScenarioModelOutput } from "../schemas";
import type { ScenarioRequest, ScenarioResult } from "../types";
import { normalizeText, replySeed, sanitizeReply } from "./text";

const scenarioKeywords: [RegExp, string[]][] = [
  [/\b(teeth|brush)/i, ["teeth-bedtime"]],
  [/\b(park|playground|slide|leave)/i, ["leaving-playground"]],
  [/\b(homework|math|reading|worksheet)/i, ["homework-meltdown"]],
  [/\b(phone|online|tiktok|instagram|snapchat|texting)/i, ["phone-bedtime", "screen-time-off"]],
  [/\b(school|bus|alarm|wake up|out of bed)/i, ["school-morning"]],
  [/\b(dress|clothes|shoes|daycare|preschool)/i, ["getting-dressed", "school-morning"]],
  [/\b(tablet|ipad|screen|tv|game)/i, ["screen-time-off"]],
  [/\b(sibling|brother|sister|share|toy)/i, ["sibling-fight"]],
];

export function matchPreset(text: string, ageYears: number) {
  const normalized = normalizeText(text);
  for (const [pattern, candidates] of scenarioKeywords) {
    if (!pattern.test(normalized)) continue;
    const id = candidates.find((candidate) => presetFitsAge(candidate, ageYears));
    if (id) return PRESETS.find((preset) => preset.id === id);
  }
}

export function finalizeScenario(req: ScenarioRequest, out: ScenarioModelOutput): ScenarioResult {
  const safety = maxSafety(detectSafety(req.text), out.safety);
  if (safety !== "none") return { kind: "safety", safety };
  if (!out.on_topic) return { kind: "off_topic" };
  const ageGroup = ageGroupOf(req.ageYears);
  return {
    kind: "ok",
    scenario: {
      id: "custom-" + crypto.randomUUID(),
      source: "custom",
      title: out.title.slice(0, 48),
      trigger: out.trigger.slice(0, 80),
      setting: out.setting.slice(0, 100),
      underlyingNeed: out.underlying_need,
      openingLine: sanitizeReply(out.opening_line, ageGroup, "upset", replySeed(req.text, 0)),
      childName: req.childName,
      ageYears: req.ageYears,
      ageGroup,
      temperament: req.temperament,
    },
  };
}
