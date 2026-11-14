import { finalizeTurn } from "../src/lib/engine/turn";
import { heuristicTurnOutput } from "../src/lib/engine/heuristics";
import { DebriefSchema, ScenarioResultSchema, TurnResultSchema } from "../src/lib/schemas";
import type { DebriefRequest, ScenarioRequest, Source } from "../src/lib/types";
import { baseUrl, cases, postCase, turnRequest } from "./eval";

function report(route: string, status: number, source: Source | undefined, latencyMs: number): void {
  console.log(`${route} HTTP ${status} source=${source ?? "—"} latencyMs=${latencyMs}`);
  if (status !== 200) process.exitCode = 1;
  if (status === 429) throw new Error("HTTP 429 — достигнут лимит запросов. Прогрев остановлен.");
}

async function main(): Promise<void> {
  const base = baseUrl();
  const item = cases.turnCases.find((item) => item.id === "E01");
  if (!item) throw new Error("Missing E01");
  const req = turnRequest(item);
  const { scenario } = req;

  const started = performance.now();
  const health = await fetch(new URL("/api/health", base));
  await health.arrayBuffer();
  report("/api/health", health.status, undefined, Math.round(performance.now() - started));

  const turn = await postCase(base, "/api/turn", req, TurnResultSchema);
  report("/api/turn", turn.status, turn.source, turn.latencyMs);

  const description: ScenarioRequest = {
    childName: scenario.childName, temperament: scenario.temperament, ageYears: scenario.ageYears,
    text: `${scenario.trigger}. ${scenario.setting}. ${item.parentText}`,
  };
  const custom = await postCase(base, "/api/scenario", description, ScenarioResultSchema);
  report("/api/scenario", custom.status, custom.source, custom.latencyMs);

  const sampleTurn = turn.ok ? turn.data.turn : finalizeTurn(req, heuristicTurnOutput(req), "fallback").turn;
  const debriefReq: DebriefRequest = {
    scenario, startMood: req.mood, turns: [sampleTurn], outcome: "ended_by_parent",
  };
  const debrief = await postCase(base, "/api/debrief", debriefReq, DebriefSchema);
  report("/api/debrief", debrief.status, debrief.source, debrief.latencyMs);
  if (!turn.ok || !custom.ok || !debrief.ok) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : "Warmup failed");
  process.exitCode = 1;
});
