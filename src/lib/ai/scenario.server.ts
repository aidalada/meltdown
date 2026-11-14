import "server-only";
import { finalizeScenario } from "../engine/scenario";
import { heuristicScenarioOutput } from "../engine/heuristics";
import { ScenarioModelOutputSchema } from "../schemas";
import type { ScenarioRequest, ScenarioResult, Source } from "../types";

import { callJson, logAiFailure } from "./client.server";
import { SCENARIO_OUTPUT_JSON_SCHEMA } from "./json-schemas";
import { SCENARIO_SYSTEM_PROMPT, buildScenarioUserMessage } from "./prompts";

export async function runScenario(req: ScenarioRequest): Promise<{ result: ScenarioResult; source: Source }> {
  try {
    const out = await callJson({
      system: SCENARIO_SYSTEM_PROMPT,
      user: buildScenarioUserMessage(req),
      schema: SCENARIO_OUTPUT_JSON_SCHEMA,
      maxTokens: 3000,
      timeoutMs: 12_000,
      maxRetries: 1,
      validate: (raw) => ScenarioModelOutputSchema.parse(raw),
    });
    return { result: finalizeScenario(req, out), source: "ai" };
  } catch (err) {
    logAiFailure("scenario", err);
    return { result: finalizeScenario(req, heuristicScenarioOutput(req)), source: "fallback" };
  }
}
