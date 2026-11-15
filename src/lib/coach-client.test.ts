import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachMemory } from "@/types/coach";
import { askCoach, coachRequest, resetCoachApi, type CoachApiRequest } from "./coach-client";
import { CoachRequestSchema } from "./schemas";

const MEMORY: CoachMemory = {
  child: { name: "Max", ageYears: 4, temperament: "strong-willed", named: true, gender: null }, rehearsals: 2, calmReached: 1,
  lastSession: { scenarioId: "teeth-bedtime", title: "Brushing teeth at bedtime", outcome: "calm_reached" },
  plan: { sessionId: "s1", phrase: "Top teeth first?", createdAt: "2026-11-14T19:00:00.000Z" },
  planCheckedIn: false, struggle: "threat",
};
const REQUEST: CoachApiRequest = coachRequest("Bedtime is a battle and I end up threatening to take the iPad.", "en", MEMORY, []);
const REPLY = { safety: "none", lead: "Sounds like the threat made it bigger.", technique: "when_then", say: "When teeth are clean, then we read." };

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

describe("askCoach", () => {
  beforeEach(() => resetCoachApi());
  afterEach(() => vi.unstubAllGlobals());

  it("returns the model's reply when the route answers in the shared envelope", async () => {
    const fetchMock = respond(200, { ok: true, data: REPLY, meta: { source: "ai", latencyMs: 1200 } });
    vi.stubGlobal("fetch", fetchMock);
    expect(await askCoach(REQUEST)).toEqual(REPLY);
    expect(fetchMock).toHaveBeenCalledWith("/api/coach", expect.objectContaining({ method: "POST" }));
  });

  it("falls back, and asks only once, while the route does not exist yet", async () => {
    const fetchMock = respond(404, { error: "not found" });
    vi.stubGlobal("fetch", fetchMock);
    expect(await askCoach(REQUEST)).toBeNull();
    expect(await askCoach(REQUEST)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats Vercel's 200 HTML not-found page as a missing route, and asks only once", async () => {
    const fetchMock = vi.fn(async () => new Response("<!DOCTYPE html><html></html>", { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await askCoach(REQUEST)).toBeNull();
    expect(await askCoach(REQUEST)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back on a server error but tries again next time", async () => {
    const fetchMock = respond(500, { ok: false, error: { code: "INTERNAL", message: "boom" } });
    vi.stubGlobal("fetch", fetchMock);
    expect(await askCoach(REQUEST)).toBeNull();
    expect(await askCoach(REQUEST)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back when the reply does not match the contract", async () => {
    vi.stubGlobal("fetch", respond(200, { ok: true, data: { ...REPLY, technique: "threat" }, meta: { source: "ai", latencyMs: 5 } }));
    expect(await askCoach(REQUEST)).toBeNull();
  });

  it("uses the local coach when the server answered from its own fallback, and keeps asking", async () => {
    const fetchMock = respond(200, { ok: true, data: REPLY, meta: { source: "fallback", latencyMs: 40 } });
    vi.stubGlobal("fetch", fetchMock);
    expect(await askCoach(REQUEST)).toBeNull();
    expect(await askCoach(REQUEST)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    expect(await askCoach(REQUEST)).toBeNull();
  });
});

describe("coachRequest", () => {
  it("builds a body the route accepts", () => {
    expect(CoachRequestSchema.safeParse(REQUEST).success).toBe(true);
  });


  it("sends the memory the model needs and the recent conversation", () => {
    const request = coachRequest("He screamed about teeth again tonight.", "ru", MEMORY, [
      { role: "coach", at: "2026-11-15T10:00:00.000Z", lines: ["Hi.", "What happened?"] },
      { role: "parent", at: "2026-11-15T10:01:00.000Z", text: "Bedtime again." },
    ]);
    expect(request.locale).toBe("ru");
    expect(request.memory).toEqual({
      child: { name: "Max", ageYears: 4, temperament: "strong-willed" }, rehearsals: 2, calmReached: 1, struggle: "threat",
      lastScenarioTitle: "Brushing teeth at bedtime", planPhrase: "Top teeth first?",
    });
    expect(request.history).toEqual([{ role: "coach", text: "Hi. What happened?" }, { role: "parent", text: "Bedtime again." }]);
  });
});
