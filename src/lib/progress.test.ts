import { describe, expect, it } from "vitest";
import { first30Stats, localDate, streakDays } from "./progress";
import { addCheckin, loadCheckins, type KV } from "./storage";
import type { Session, Turn } from "./types";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();
const turn = (parentText: string, delta: number, tag: Turn["tags"][number]["tag"]): Turn => ({
  index: 0, parentText, delta, moodBefore: 30, moodAfter: 30 + delta, childReply: "ok", source: "fallback",
  tags: [{ tag, evidence: parentText, weight: delta, applied: delta }],
});
const session = (createdAt: string, turns: Turn[] = [turn("x", 5, "name_feeling")], outcome: Session["outcome"] = "ended_by_parent") =>
  ({ createdAt, turns, outcome }) as Session;

describe("streakDays", () => {
  const today = new Date(2026, 10, 14, 20);
  it("counts days ending today", () => {
    expect(streakDays([session(at(2026, 11, 14)), session(at(2026, 11, 13)), session(at(2026, 11, 12)), session(at(2026, 11, 10))], today)).toBe(3);
  });
  it("still counts a streak that ended yesterday", () => {
    expect(streakDays([session(at(2026, 11, 13)), session(at(2026, 11, 12))], today)).toBe(2);
  });
  it("is 0 after a missed day and ignores empty sessions", () => {
    expect(streakDays([session(at(2026, 11, 12))], today)).toBe(0);
    expect(streakDays([session(at(2026, 11, 14), [])], today)).toBe(0);
  });
  it("formats local dates", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("first30Stats", () => {
  it("counts rehearsals, calm outcomes and best phrases", () => {
    const stats = first30Stats([
      session(at(2026, 11, 14), [turn("You're mad.", 12, "name_feeling"), turn("No iPad!", -15, "threat")], "calm_reached"),
      session(at(2026, 11, 13), [turn("Blue or green?", 8, "offer_choice"), turn("You're mad.", 12, "name_feeling")]),
      session(at(2026, 11, 12), []),
    ]);
    expect(stats).toEqual({ rehearsals: 2, calmReached: 1, bestPhrases: ["You're mad.", "Blue or green?"] });
  });
});

describe("check-ins", () => {
  it("keeps one answer per plan", () => {
    const map = new Map<string, string>();
    const kv: KV = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } };
    addCheckin({ date: "2026-11-14", sessionId: "a", result: "partly" }, kv);
    addCheckin({ date: "2026-11-14", sessionId: "a", result: "worked" }, kv);
    addCheckin({ date: "2026-11-14", sessionId: "b", result: "didnt" }, kv);
    expect(loadCheckins(kv).map((c) => `${c.sessionId}:${c.result}`)).toEqual(["a:worked", "b:didnt"]);
  });
});
