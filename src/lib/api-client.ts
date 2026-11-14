import type { ZodType } from "zod";
import { finalizeDebrief } from "./engine/debrief";
import { heuristicDebriefOutput, heuristicScenarioOutput, heuristicTurnOutput } from "./engine/heuristics";
import { finalizeScenario } from "./engine/scenario";
import { finalizeTurn } from "./engine/turn";
import { ApiResponseSchema, DebriefSchema, ScenarioResultSchema, TurnResultSchema } from "./schemas";
import type { Debrief, DebriefRequest, ScenarioRequest, ScenarioResult, Source, TurnRequest, TurnResult } from "./types";

export class RateLimitedError extends Error {}

function isOffline(): boolean {
  try {
    return sessionStorage.getItem("meltdown:v1:offline") === "1";
  } catch {
    return false;
  }
}

type Sourced<T> = { result: T; source: Source };

async function post<Result>(
  path: string, request: unknown, schema: ZodType<Result>, fallback: () => Result,
): Promise<Sourced<Result>> {
  const local = (): Sourced<Result> => ({ result: fallback(), source: "fallback" });
  if (isOffline()) return local();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    let response: Response;
    try {
      response = await fetch(path, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request), signal: controller.signal,
      });
    } catch {
      return local();
    }
    if (response.status === 429) throw new RateLimitedError();
    if (response.status === 400) throw new Error("Bad request");
    if (response.status !== 200) return local();
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return local();
    }
    const parsed = ApiResponseSchema(schema).safeParse(body);
    if (!parsed.success || !parsed.data.ok) return local();
    return { result: parsed.data.data, source: parsed.data.meta.source };
  } finally {
    clearTimeout(timer);
  }
}

export function postTurn(req: TurnRequest): Promise<Sourced<TurnResult>> {
  return post("/api/turn", req, TurnResultSchema, () => finalizeTurn(req, heuristicTurnOutput(req), "fallback"));
}

export function postScenario(req: ScenarioRequest): Promise<Sourced<ScenarioResult>> {
  return post("/api/scenario", req, ScenarioResultSchema, () => finalizeScenario(req, heuristicScenarioOutput(req)));
}

export function postDebrief(req: DebriefRequest): Promise<Sourced<Debrief>> {
  return post("/api/debrief", req, DebriefSchema, () => finalizeDebrief(req, heuristicDebriefOutput(req), "fallback"));
}
