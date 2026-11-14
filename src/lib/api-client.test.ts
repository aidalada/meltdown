import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { postDebrief, postScenario, postTurn, RateLimitedError } from "./api-client";
import { PRESETS } from "./data";
import type { TurnRequest, TurnResult } from "./types";

const scenario = PRESETS[0];
const req: TurnRequest = {
  scenario, mood: 30, difficulty: "normal", turnIndex: 0, history: [{ role: "child", text: scenario.openingLine }],
  prevTags: [], parentText: "You're really mad that it's bedtime, huh?",
};
const fromServer: TurnResult = {
  turn: { index: 0, parentText: req.parentText, moodBefore: 30, moodAfter: 28, delta: -2, tags: [], childReply: "One more story?", source: "ai" },
  band: "upset", outcome: "continue", safety: "none",
};

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("sessionStorage", { getItem: () => null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("returns the validated server data and its source", async () => {
  fetchMock.mockResolvedValue(Response.json({ ok: true, data: fromServer, meta: { source: "ai", latencyMs: 14 } }));
  expect(await postTurn(req)).toEqual({ result: fromServer, source: "ai" });
  expect(fetchMock).toHaveBeenCalledWith("/api/turn", expect.objectContaining({ method: "POST", body: JSON.stringify(req) }));
});

it.each(["malformed success", "HTTP 500", "network error"])("runs the local turn engine on %s", async (failure) => {
  if (failure === "network error") fetchMock.mockRejectedValue(new TypeError("offline"));
  else if (failure === "HTTP 500") fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
  else fetchMock.mockResolvedValue(Response.json({ ok: true, data: {}, meta: { source: "ai", latencyMs: 10 } }));
  const response = await postTurn(req);
  expect(response).toMatchObject({ source: "fallback", result: { turn: { source: "fallback", moodAfter: 42, tags: [{ tag: "name_feeling" }] } } });
  expect(fetchMock).toHaveBeenCalledOnce();
});

it("throws RateLimitedError for HTTP 429", async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 429 }));
  await expect(postTurn(req)).rejects.toBeInstanceOf(RateLimitedError);
});

it("throws Bad request for HTTP 400", async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 400 }));
  await expect(postTurn(req)).rejects.toThrow(/^Bad request$/);
});

it("uses the local engine for all three routes when the offline flag is set", async () => {
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => key === "meltdown:v1:offline" ? "1" : null });
  expect(await postTurn(req)).toMatchObject({ source: "fallback", result: { turn: { moodAfter: 42 } } });
  expect(await postScenario({ text: "Time to put shoes on", ageYears: 4, childName: "Max", temperament: "sensitive" }))
    .toMatchObject({ source: "fallback", result: { kind: "ok" } });
  expect(await postDebrief({ scenario, turns: [], startMood: 30, outcome: "ended_by_parent" }))
    .toMatchObject({ source: "fallback", result: { stats: { turns: 0 } } });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("aborts a stalled fetch at 30 seconds and returns a local turn", async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) throw new Error("Missing abort signal");
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  }));
  const pending = postTurn(req);
  const signal = fetchMock.mock.calls[0][1]?.signal;
  await vi.advanceTimersByTimeAsync(29_999);
  expect(signal?.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(signal?.aborted).toBe(true);
  expect(await pending).toMatchObject({ source: "fallback", result: { turn: { moodAfter: 42 } } });
  expect(fetchMock).toHaveBeenCalledOnce();
});
