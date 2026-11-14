import "server-only";
import { finalizeDebrief } from "../engine/debrief";
import { heuristicDebriefOutput } from "../engine/heuristics";
import type { DebriefRequest, Debrief, Source } from "../types";

export async function runDebrief(req: DebriefRequest): Promise<{ result: Debrief; source: Source }> {
  const result = finalizeDebrief(req, heuristicDebriefOutput(req), "fallback");
  return { result, source: "fallback" };
}
