import { ageGroupOf, FALLBACK_LINES, PRESETS, presetFitsAge, TECHNIQUES, TECHNIQUE_BY_TAG } from "../data";
import { detectSafety } from "../safety";
import type { DebriefModelOutput, ScenarioModelOutput } from "../schemas";
import type { DebriefRequest, PositiveTag, ScenarioRequest, TagHit, TurnModelOutput, TurnRequest } from "../types";
import { examplePhrase, fallbackPlan, turnsToRewrite } from "./debrief";
import { BANDS, bandIndex, bandOf } from "./mood";
import { normalizeText, pickFallbackLine, replySeed } from "./text";
import { postProcessTags } from "./turn";

const patterns = TECHNIQUES.map(({ tag, patterns }) => ({
  tag, patterns: patterns.map((pattern) => new RegExp(pattern, "i")),
}));

export function heuristicTags(text: string): TagHit[] {
  const normalized = normalizeText(text);
  const hits: TagHit[] = [];
  for (const technique of patterns) {
    for (const pattern of technique.patterns) {
      const match = pattern.exec(normalized);
      if (match) {
        hits.push({ tag: technique.tag, evidence: match[0] });
        break;
      }
    }
  }
  return postProcessTags(hits, normalized);
}

export function heuristicTurnOutput(req: TurnRequest): TurnModelOutput {
  const index = bandIndex(bandOf(req.mood));
  const group = req.scenario.ageGroup;
  const seed = replySeed(req.parentText, req.turnIndex);
  return {
    safety: detectSafety(req.parentText),
    tags: heuristicTags(req.parentText),
    replies: {
      calmer: pickFallbackLine(group, BANDS[Math.min(index + 1, BANDS.length - 1)], seed),
      same: pickFallbackLine(group, BANDS[index], seed),
      worse: pickFallbackLine(group, BANDS[Math.max(index - 1, 0)], seed),
    },
  };
}

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

// Reject clear requests for unrelated content before they can match a preset keyword.
const unrelatedRequest = /^(?:please[\s,]+)?(?:(?:can|could|would) you\s+)?(?:write|compose|generate|recite|tell)\s+(?:(?:me|us)\s+)?(?:(?:a|an|the|some)\s+)?(?:poems?|stor(?:y|ies)|jokes?|songs?|essays?)\b/i;

export function heuristicScenarioOutput(req: ScenarioRequest): ScenarioModelOutput {
  const text = normalizeText(req.text);
  const id = scenarioKeywords.flatMap(([pattern, candidates]) => pattern.test(text) ? candidates : [])
    .find((candidate) => presetFitsAge(candidate, req.ageYears));
  const preset = PRESETS.find((scenario) => scenario.id === id);
  return {
    on_topic: !unrelatedRequest.test(text),
    safety: detectSafety(text),
    title: preset?.title ?? "A hard moment",
    trigger: preset?.trigger ?? text.slice(0, 60),
    setting: preset?.setting ?? "At home",
    underlying_need: preset?.underlyingNeed ?? "autonomy",
    opening_line: preset?.openingLine ?? FALLBACK_LINES[ageGroupOf(req.ageYears)].upset[0],
  };
}

const suggestedTags: PositiveTag[] = ["name_feeling", "offer_choice", "when_then", "connect_first"];

export function heuristicDebriefOutput(req: DebriefRequest): DebriefModelOutput {
  const totals = new Map<PositiveTag, number>();
  for (const turn of req.turns) {
    for (const { tag, applied } of turn.tags) {
      const technique = TECHNIQUE_BY_TAG[tag];
      if (technique.polarity === "positive") totals.set(technique.tag, (totals.get(technique.tag) ?? 0) + applied);
    }
  }
  let summary: string;
  const count = req.turns.length;
  if (req.outcome === "calm_reached") {
    const best = [...totals].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "name_feeling";
    summary = req.scenario.childName + " calmed down in " + count + " turns. " + TECHNIQUE_BY_TAG[best].label + " made the biggest difference.";
  } else {
    const next = suggestedTags.find((tag) => !totals.has(tag)) ?? "name_feeling";
    summary = "You stayed with it for " + count + " turns. Next time, try this: " + TECHNIQUE_BY_TAG[next].shortTip;
  }
  // A phrase from this scenario's plan fits the moment better than the generic example (about toothbrushes).
  const plan = req.scenario.planPhrases ?? [];
  const rewrites = turnsToRewrite(req.turns).map((turn) => {
    const negative = turn.tags.map(({ tag }) => TECHNIQUE_BY_TAG[tag]).find((item) => item.polarity === "negative");
    const better: PositiveTag[] = negative?.betterWith.length ? negative.betterWith : ["name_feeling"];
    const { phrase, technique } = plan.find((p) => better.includes(p.technique)) ?? examplePhrase(better[0]);
    return { turn_index: turn.index, improved: phrase, technique };
  });
  return { summary, rewrites, tonight_plan: fallbackPlan(req.scenario) };
}
