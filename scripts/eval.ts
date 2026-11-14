import { pathToFileURL } from "node:url";
import type { ZodType } from "zod";
import rawCases from "../src/data/eval-cases.json";
import { PRESETS } from "../src/lib/data";
import { normalizeText, wordCount } from "../src/lib/engine/text";
import {
  ApiResponseSchema, EvalCasesFileSchema, ScenarioResultSchema, TurnResultSchema, type EvalTurnCase,
} from "../src/lib/schemas";
import type { ScenarioRequest, ScenarioResult, TurnRequest } from "../src/lib/types";

export const cases = EvalCasesFileSchema.parse(rawCases);

export function baseUrl(): URL {
  const arg = process.argv.slice(2).find((arg) => arg.startsWith("--base="));
  return new URL(arg === undefined ? "http://localhost:3000" : arg.slice("--base=".length));
}

export function turnRequest(item: EvalTurnCase): TurnRequest {
  const scenario = PRESETS.find((preset) => preset.id === item.scenarioId);
  if (!scenario) throw new Error("Unknown preset for " + item.id);
  return {
    scenario, difficulty: "normal", mood: item.mood, turnIndex: 0,
    history: [{ role: "child", text: scenario.openingLine }], parentText: item.parentText, prevTags: [],
  };
}

export async function postCase<T>(base: URL, route: string, request: unknown, schema: ZodType<T>) {
  const started = performance.now();
  const response = await fetch(new URL(route, base), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
  });
  const { status } = response;
  if (status !== 200) {
    await response.body?.cancel();
    return { ok: false, status, source: undefined, latencyMs: Math.round(performance.now() - started) } as const;
  }
  const raw: unknown = await response.json().catch(() => null);
  const parsed = ApiResponseSchema(schema).safeParse(raw);
  if (!parsed.success || !parsed.data.ok) {
    return { ok: false, status, source: undefined, latencyMs: Math.round(performance.now() - started) } as const;
  }
  const { meta, data } = parsed.data;
  return { ok: true, status, ...meta, data } as const;
}

function row(id: string, pass: boolean, actual: string, expected: string, words: number | string, source: string, ms: number) {
  console.log(`| ${id} | ${pass ? "PASS" : "FAIL"} | ${actual || "—"} | ${expected || "—"} | ${words} | ${source} | ${ms} |`);
}

function failedRequest(id: string, status: number, expected: string, ms: number): void {
  row(id, false, status === 200 ? "invalid response" : `HTTP ${status}`, expected, "—", "—", ms);
  if (status === 429) throw new Error(`${id}: HTTP 429 — достигнут лимит запросов. Прогон остановлен.`);
}

function describeScenario(result: ScenarioResult | typeof cases.scenarioCases[number]["expect"]): string {
  return result.kind === "safety" ? `safety (${result.safety})` : result.kind;
}

async function main(): Promise<void> {
  const base = baseUrl();
  let tags = 0, replies = 0, scenarios = 0, fallback = 0;
  const latencies: number[] = [];

  console.log("| id | PASS/FAIL | tags / kind | expected | words | source | latencyMs |");
  console.log("| --- | --- | --- | --- | ---: | --- | ---: |");
  for (const item of cases.turnCases) {
    const req = turnRequest(item);
    const res = await postCase(base, "/api/turn", req, TurnResultSchema);
    const expected = item.expectTags.join(", ");
    if (!res.ok) {
      failedRequest(item.id, res.status, expected, res.latencyMs);
      continue;
    }
    latencies.push(res.latencyMs);
    if (res.source === "fallback") fallback++;
    const actual = res.data.turn.tags.map(({ tag }) => tag);
    const reply = res.data.turn.childReply;
    const words = wordCount(normalizeText(reply));
    const tagsPass = res.source === "ai" && item.expectTags.every((tag) => actual.includes(tag)) &&
      !item.forbidTags.some((tag) => actual.includes(tag));
    const replyPass = res.source === "ai" && words <= (req.scenario.ageYears <= 5 ? 12 : 20) &&
      !(item.replyMustNotMatch && new RegExp(item.replyMustNotMatch, "i").test(reply));
    if (tagsPass) tags++;
    if (replyPass) replies++;
    row(item.id, tagsPass && replyPass, actual.join(", "), expected, words, res.source, res.latencyMs);
  }

  const { childName, temperament } = PRESETS[0];
  for (const item of cases.scenarioCases) {
    const req: ScenarioRequest = { text: item.text, ageYears: item.ageYears, childName, temperament };
    const res = await postCase(base, "/api/scenario", req, ScenarioResultSchema);
    const expected = describeScenario(item.expect);
    if (!res.ok) {
      failedRequest(item.id, res.status, expected, res.latencyMs);
      continue;
    }
    if (res.source === "fallback") fallback++;
    const actual = describeScenario(res.data);
    const pass = res.source === "ai" && actual === expected;
    if (pass) scenarios++;
    row(item.id, pass, actual, expected, "—", res.source, res.latencyMs);
  }

  const count = cases.turnCases.length;
  console.log(`tags ${tags}/${count}, replies ${replies}/${count}, scenarios ${scenarios}/${cases.scenarioCases.length}, fallback ${fallback}`);
  if (latencies.length) {
    latencies.sort((a, b) => a - b);
    const percentile = (p: number) => latencies[Math.ceil(latencies.length * p) - 1];
    const mean = latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length;
    console.log(`turn latencyMs: p50 ${percentile(0.5)}, p90 ${percentile(0.9)}, mean ${mean.toFixed(1)}`);
  } else {
    console.log("turn latencyMs: p50 —, p90 —, mean —");
  }
  if (tags < 17 || replies < count || fallback > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : "Eval failed");
    process.exitCode = 1;
  });
}
