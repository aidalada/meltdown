import "server-only";
import { finalizeTurn } from "../engine/turn";
import { heuristicTurnOutput } from "../engine/heuristics";
import type { TurnRequest, TurnResult, Source } from "../types";

export async function runTurn(req: TurnRequest): Promise<{ result: TurnResult; source: Source }> {
  const result = finalizeTurn(req, heuristicTurnOutput(req), "fallback");
  return { result, source: "fallback" };
}
