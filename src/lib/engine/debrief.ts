import { TECHNIQUE_BY_TAG } from "../data";
import type { DebriefModelOutput } from "../schemas";
import type { Debrief, DebriefRequest, PlanPhrase, PositiveTag, Rewrite, Scenario, Source, Turn } from "../types";

export function turnsToRewrite(turns: Turn[]): Turn[] {
  return turns.filter((turn) =>
    turn.delta <= 0 || !turn.tags.some(({ tag }) => TECHNIQUE_BY_TAG[tag].polarity === "positive")
  ).sort((a, b) => a.delta - b.delta).slice(0, 3);
}

export function examplePhrase(technique: PositiveTag): PlanPhrase {
  // A positive tag always points to a positive entry in the validated lookup.
  const item = TECHNIQUE_BY_TAG[technique];
  if (item.polarity !== "positive") throw new Error("Missing positive technique example");
  return { phrase: item.goodExample, technique };
}

const defaultTags: PositiveTag[] = ["name_feeling", "offer_choice", "when_then"];

export function fallbackPlan(scenario: Scenario): PlanPhrase[] {
  return scenario.planPhrases?.length ? scenario.planPhrases : defaultTags.map(examplePhrase);
}

function completePlan(proposed: PlanPhrase[], scenario: Scenario): PlanPhrase[] {
  const candidates = [...proposed.slice(0, 3), ...fallbackPlan(scenario), ...defaultTags.map(examplePhrase)];
  const plan: PlanPhrase[] = [];
  for (const phrase of candidates) {
    if (!plan.some((chosen) => chosen.technique === phrase.technique)) plan.push(phrase);
    if (plan.length === 3) break;
  }
  return plan;
}

export function finalizeDebrief(req: DebriefRequest, out: DebriefModelOutput, source: Source): Debrief {
  const eligible = new Map(turnsToRewrite(req.turns).map((turn) => [turn.index, turn]));
  const rewrites: Rewrite[] = [];
  for (const { turn_index, improved, technique } of out.rewrites) {
    const turn = eligible.get(turn_index);
    if (!turn) continue;
    rewrites.push({ turnIndex: turn.index, original: turn.parentText, improved, technique });
    eligible.delete(turn.index);
  }
  const moods = [req.startMood, ...req.turns.map((turn) => turn.moodAfter)];
  return {
    summary: out.summary,
    rewrites,
    tonightPlan: completePlan(out.tonight_plan, req.scenario),
    stats: {
      turns: req.turns.length, startMood: req.startMood, endMood: moods[moods.length - 1],
      peakMood: Math.max(...moods), lowMood: Math.min(...moods), outcome: req.outcome,
    },
    source,
  };
}
