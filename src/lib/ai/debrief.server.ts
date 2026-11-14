import "server-only";
import { finalizeDebrief, turnsToRewrite } from "../engine/debrief";
import { heuristicDebriefOutput } from "../engine/heuristics";
import { DebriefModelOutputSchema } from "../schemas";
import type { DebriefRequest, Debrief, Source } from "../types";

import { callJson, logAiFailure } from "./client.server";
import { DEBRIEF_OUTPUT_JSON_SCHEMA } from "./json-schemas";
import { DEBRIEF_SYSTEM_PROMPT, buildDebriefUserMessage } from "./prompts";

export async function runDebrief(req: DebriefRequest): Promise<{ result: Debrief; source: Source }> {
  try {
    const out = await callJson({
      system: DEBRIEF_SYSTEM_PROMPT,
      user: buildDebriefUserMessage(req, turnsToRewrite(req.turns)),
      schema: DEBRIEF_OUTPUT_JSON_SCHEMA,
      maxTokens: 6000,
      timeoutMs: 12_000,
      maxRetries: 1,
      validate: (raw) => DebriefModelOutputSchema.parse(raw),
    });
    return { result: finalizeDebrief(req, out, "ai"), source: "ai" };
  } catch (err) {
    logAiFailure("debrief", err);
    return { result: finalizeDebrief(req, heuristicDebriefOutput(req), "fallback"), source: "fallback" };
  }
}
