import "server-only";
import { finalizeScenario } from "../engine/scenario";
import { heuristicScenarioOutput } from "../engine/heuristics";
import type { ScenarioRequest, ScenarioResult, Source } from "../types";

export async function runScenario(req: ScenarioRequest): Promise<{ result: ScenarioResult; source: Source }> {
  const result = finalizeScenario(req, heuristicScenarioOutput(req));
  return { result, source: "fallback" };
}
