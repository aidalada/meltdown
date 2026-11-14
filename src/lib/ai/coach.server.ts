import "server-only";
import type { CoachApiReply } from "../coach-client";
import { finalizeCoach, localCoachReply, MIN_STORY } from "../engine/coach";
import { CoachModelOutputSchema, type CoachRequest } from "../schemas";
import type { Source } from "../types";

import { callJson, logAiFailure } from "./client.server";
import { COACH_OUTPUT_JSON_SCHEMA } from "./json-schemas";
import { buildCoachUserMessage, COACH_SYSTEM_PROMPT } from "./prompts";

/** Under the browser's 8 s abort (src/lib/coach-client.ts), so the fallback still arrives in time. */
const TIMEOUT_MS = 7000;

export async function runCoach(req: CoachRequest): Promise<{ result: CoachApiReply; source: Source }> {
  const local = localCoachReply(req, new Date());
  // Crisis words and too-short messages never go to the model.
  if (local.safety !== "none" || req.text.length < MIN_STORY) return { result: local, source: "fallback" };
  try {
    const out = await callJson({
      system: COACH_SYSTEM_PROMPT,
      user: buildCoachUserMessage(req),
      schema: COACH_OUTPUT_JSON_SCHEMA,
      maxTokens: 3000,
      timeoutMs: TIMEOUT_MS,
      maxRetries: 0,
      validate: (raw) => CoachModelOutputSchema.parse(raw),
    });
    return { result: finalizeCoach(req, out, local), source: "ai" };
  } catch (err) {
    logAiFailure("coach", err);
    return { result: local, source: "fallback" };
  }
}
