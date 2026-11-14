import "server-only";
import { finalizeTurn } from "../engine/turn";
import { heuristicTurnOutput } from "../engine/heuristics";
import { TurnModelOutputSchema } from "../schemas";
import type { TurnRequest, TurnResult, Source } from "../types";

import { callJson, logAiFailure } from "./client.server";
import { TURN_OUTPUT_JSON_SCHEMA } from "./json-schemas";
import { TURN_SYSTEM_PROMPT, buildTurnUserMessage } from "./prompts";

export async function runTurn(req: TurnRequest): Promise<{ result: TurnResult; source: Source }> {
  try {
    const out = await callJson({
      system: TURN_SYSTEM_PROMPT,
      user: buildTurnUserMessage(req),
      schema: TURN_OUTPUT_JSON_SCHEMA,
      maxTokens: 4000,
      timeoutMs: 12_000,
      maxRetries: 0,
      validate: (raw) => TurnModelOutputSchema.parse(raw),
    });
    return { result: finalizeTurn(req, out, "ai"), source: "ai" };
  } catch (err) {
    logAiFailure("turn", err);
    return { result: finalizeTurn(req, heuristicTurnOutput(req), "fallback"), source: "fallback" };
  }
}
