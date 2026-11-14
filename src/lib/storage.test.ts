import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SESSIONS_KEEP, START_MOOD } from "./constants";
import { PRESETS } from "./data";
import {
  ensureTrialStarted, listSessions, loadPlan, loadProfile, loadSession, savePlan, saveProfile, saveSession, trialDay,
  type KV,
} from "./storage";
import type { Profile, Session } from "./types";

function memoryKV(): KV & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

function makeSession(): Session {
  const scenario = PRESETS[0];
  return {
    version: 1, id: randomUUID(), createdAt: new Date().toISOString(), scenario, difficulty: "normal",
    startMood: START_MOOD[scenario.temperament], mood: START_MOOD[scenario.temperament],
    turns: [], status: "active", outcome: "continue",
  };
}

describe("storage", () => {
  it("saves and loads a session", () => {
    const kv = memoryKV();
    const s = makeSession();
    saveSession(s, kv);
    expect(loadSession(s.id, kv)).toEqual(s);
    expect(listSessions(kv).map((x) => x.id)).toEqual([s.id]);
  });

  it(`keeps only the newest ${SESSIONS_KEEP} sessions`, () => {
    const kv = memoryKV();
    const all = Array.from({ length: SESSIONS_KEEP + 3 }, makeSession);
    all.forEach((s) => saveSession(s, kv));
    const listed = listSessions(kv);
    expect(listed).toHaveLength(SESSIONS_KEEP);
    expect(listed[0].id).toBe(all[all.length - 1].id);
    expect(loadSession(all[0].id, kv)).toBeNull();
  });

  it("removes corrupted JSON and returns null", () => {
    const kv = memoryKV();
    kv.setItem("meltdown:v1:profile", "{not json");
    expect(loadProfile(kv)).toBeNull();
    expect(kv.map.has("meltdown:v1:profile")).toBe(false);
  });

  it("removes records that fail the schema", () => {
    const kv = memoryKV();
    const id = randomUUID();
    kv.setItem(`meltdown:v1:session:${id}`, JSON.stringify({ version: 2 }));
    expect(loadSession(id, kv)).toBeNull();
    expect(kv.map.size).toBe(0);
  });

  it("round-trips profile and plan", () => {
    const kv = memoryKV();
    const profile: Profile = { version: 1, childName: "Max", ageYears: 4, temperament: "strong-willed", coachHints: true, voiceOn: false };
    saveProfile(profile, kv);
    expect(loadProfile(kv)).toEqual(profile);
    savePlan("abc", PRESETS[0].planPhrases ?? [], kv);
    expect(loadPlan(kv)?.phrases).toEqual(PRESETS[0].planPhrases);
  });

  it("counts trial days from the first rehearsal", () => {
    const kv = memoryKV();
    expect(trialDay(new Date(), kv)).toBe(0);
    const started = ensureTrialStarted(kv);
    expect(ensureTrialStarted(kv)).toBe(started);
    const later = new Date(new Date(started).getTime() + 2.5 * 86_400_000);
    expect(trialDay(later, kv)).toBe(3);
  });

  it("does nothing without storage", () => {
    const s = makeSession();
    expect(() => saveSession(s, null)).not.toThrow();
    expect(loadSession(s.id, null)).toBeNull();
    expect(listSessions(null)).toEqual([]);
  });
});
