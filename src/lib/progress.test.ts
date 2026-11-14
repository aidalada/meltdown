import { describe, expect, it } from "vitest";
import { first30Stats, localDate, skillScores, streakDays } from "./progress";
import { addCheckin, loadCheckins, type KV } from "./storage";
import type { Session, TechniqueTag, Turn } from "./types";

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

describe("skillScores", () => {
  const tagged = (...tags: TechniqueTag[]) => ({ tags: tags.map((tag) => ({ tag, evidence: "", weight: 0, applied: 0 })) });
  const scores = (turns: ReturnType<typeof tagged>[]) => skillScores([{ turns }] as unknown as Pick<Session, "turns">[]);

  it("starts every skill at 0 before any rehearsal", () => {
    expect(skillScores([])).toEqual({ empathy: 0, boundaries: 0, control: 0, choices: 0 });
  });

  it("grows a skill with the techniques that show it", () => {
    const s = scores([tagged("name_feeling"), tagged("offer_choice"), tagged("name_feeling", "when_then")]);
    expect(s.empathy).toBe(50);       // 2 good turns: 200 / 4
    expect(s.choices).toBe(33);       // 1 good turn: 100 / 3
    expect(s.boundaries).toBe(33);
    expect(s.control).toBe(60);       // 3 calm turns of 3: 300 / 5
  });

  it("lets a harmful turn cost twice a good one", () => {
    const calm = scores([tagged("offer_choice"), tagged("offer_choice")]);
    const withThreat = scores([tagged("offer_choice"), tagged("offer_choice"), tagged("threat")]);
    expect(calm.choices).toBe(50);
    expect(withThreat.choices).toBe(33);          // 200 / (2 + 2 + 2)
    expect(withThreat.boundaries).toBe(0);
    expect(withThreat.control).toBeLessThan(calm.control);
  });

  it("stays between 0 and 100", () => {
    const many = scores(Array.from({ length: 60 }, () => tagged("name_feeling", "offer_choice", "calm_limit")));
    for (const value of Object.values(many)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
