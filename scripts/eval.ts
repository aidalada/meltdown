import { pathToFileURL } from "node:url";
import type { ZodType } from "zod";
import rawCases from "../src/data/eval-cases.json";
import { PRESETS } from "../src/lib/data";
import { normalizeText, wordCount } from "../src/lib/engine/text";
import {
  ApiResponseSchema, CoachReplySchema, EvalCasesFileSchema, ScenarioResultSchema, TurnResultSchema,
  type CoachRequest, type EvalTurnCase,
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
  checkRateLimit(id, status);
}

function checkRateLimit(id: string, status: number): void {
  if (status === 429) throw new Error(`${id}: HTTP 429 — достигнут лимит запросов. Прогон остановлен.`);
}

function describeScenario(result: ScenarioResult | typeof cases.scenarioCases[number]["expect"]): string {
  return result.kind === "safety" ? `safety (${result.safety})` : result.kind;
}

async function evalPractice(base: URL, only?: "turn" | "scenario"): Promise<void> {
  const turnCases = only === "scenario" ? [] : cases.turnCases;
  const scenarioCases = only === "turn" ? [] : cases.scenarioCases;
  let tags = 0, replies = 0, scenarios = 0, fallback = 0;
  const latencies: number[] = [];

  console.log("| id | PASS/FAIL | tags / kind | expected | words | source | latencyMs |");
  console.log("| --- | --- | --- | --- | ---: | --- | ---: |");
  for (const item of turnCases) {
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
  for (const item of scenarioCases) {
    const req: ScenarioRequest = { text: item.text, ageYears: item.ageYears, childName, temperament };
    const res = await postCase(base, "/api/scenario", req, ScenarioResultSchema);
    const expected = describeScenario(item.expect);
    if (!res.ok) {
      failedRequest(item.id, res.status, expected, res.latencyMs);
      continue;
    }
    const actual = describeScenario(res.data);
    const unexpectedFallback = res.source === "fallback" && item.expect.kind !== "safety";
    if (unexpectedFallback) fallback++;
    const forbidden = item.forbidPattern && new RegExp(item.forbidPattern, "i");
    const scenario = res.data.kind === "ok" ? res.data.scenario : undefined;
    const mismatch = scenario && forbidden
      ? (["title", "setting", "openingLine"] as const).find((field) => forbidden.test(scenario[field]))
      : undefined;
    const pass = !unexpectedFallback && actual === expected && mismatch === undefined;
    if (pass) scenarios++;
    row(item.id, pass, mismatch ? `${actual} (forbidPattern in ${mismatch})` : actual, expected, "—", res.source, res.latencyMs);
  }

  const count = turnCases.length;
  const summary = [];
  if (count) summary.push(`tags ${tags}/${count}`, `replies ${replies}/${count}`);
  if (scenarioCases.length) summary.push(`scenarios ${scenarios}/${scenarioCases.length}`);
  console.log([...summary, `fallback ${fallback}`].join(", "));
  if (latencies.length) {
    latencies.sort((a, b) => a - b);
    const percentile = (p: number) => latencies[Math.ceil(latencies.length * p) - 1];
    const mean = latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length;
    console.log(`turn latencyMs: p50 ${percentile(0.5)}, p90 ${percentile(0.9)}, mean ${mean.toFixed(1)}`);
  } else if (count) {
    console.log("turn latencyMs: p50 —, p90 —, mean —");
  }
  if ((count > 0 && (tags < 17 || replies < count)) || fallback > 0 ||
      scenarios < scenarioCases.length) process.exitCode = 1;
}

async function evalCoach(base: URL): Promise<void> {
  const memory: CoachRequest["memory"] = {
    child: null, rehearsals: 0, calmReached: 0, struggle: null, lastScenarioTitle: null, planPhrase: null,
  };
  const cyrillic = /\p{Script=Cyrillic}/u;
  const latencies: number[] = [];
  let passed = 0, safetyFallback = 0, unexpectedFallback = 0;
  console.log("| id | PASS/FAIL | safety | technique | preset | say words | source | latencyMs |");
  console.log("| --- | --- | --- | --- | --- | ---: | --- | ---: |");
  for (const item of cases.coachCases) {
    const child: CoachRequest["memory"]["child"] = item.childAge === undefined ? null :
      { ageYears: item.childAge, name: "not told yet", temperament: "strong-willed" };
    const req: CoachRequest = { text: item.text, locale: item.locale, memory: { ...memory, child }, history: [] };
    const res = await postCase(base, "/api/coach", req, CoachReplySchema);
    if (!res.ok) {
      const reason = res.status === 200 ? "invalid response" : `HTTP ${res.status}`;
      console.log(`| ${item.id} | FAIL | ${reason} | — | — | — | — | ${res.latencyMs} |`);
      checkRateLimit(item.id, res.status);
      continue;
    }
    latencies.push(res.latencyMs);
    const { safety, lead, technique, say, preset } = res.data;
    const words = say === undefined ? 0 : wordCount(normalizeText(say));
    if (res.source === "fallback") {
      if (item.expectSafety !== "none" && safety === item.expectSafety) safetyFallback++;
      else unexpectedFallback++;
    }
    const sayOk = item.expectSafety !== "none" || item.expectNoSay ? say === undefined
      : say !== undefined && !cyrillic.test(say) && words > 0 && words <= 18;
    const accepted = Array.isArray(item.expectPreset) ? item.expectPreset : [item.expectPreset];
    const presetOk = item.expectPreset === undefined ||
      (item.expectPreset === "none" ? preset === undefined : preset !== undefined && accepted.includes(preset));
    const pass = safety === item.expectSafety && (item.expectSafety !== "none" || res.source === "ai") &&
      (!item.expectTechniques || item.expectTechniques.includes(technique)) &&
      !item.forbidTechniques?.includes(technique) && presetOk && sayOk &&
      cyrillic.test(lead) === (item.locale === "ru");
    if (pass) passed++;
    console.log(`| ${item.id} | ${pass ? "PASS" : "FAIL"} | ${safety} | ${technique} | ${preset ?? "—"} | ${words} | ${res.source} | ${res.latencyMs} |`);
  }
  console.log(`coach ${passed}/${cases.coachCases.length}, fallback ${unexpectedFallback}, safety fallback ${safetyFallback}`);
  latencies.sort((a, b) => a - b);
  console.log(`coach latencyMs: p50 ${latencies[Math.ceil(latencies.length / 2) - 1] ?? "—"}`);
  if (passed < 10 || unexpectedFallback > 0) process.exitCode = 1;
}

async function main(): Promise<void> {
  const base = baseUrl();
  const only = process.argv.slice(2).find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
  if (only !== undefined && only !== "turn" && only !== "scenario" && only !== "coach") {
    throw new Error("--only must be turn, scenario or coach");
  }
  if (only !== "coach") await evalPractice(base, only);
  if (only === undefined || only === "coach") await evalCoach(base);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : "Eval failed");
    process.exitCode = 1;
  });
}
