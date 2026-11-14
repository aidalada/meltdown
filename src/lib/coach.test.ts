import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { textsFor } from "@/content/locale";
import type { CoachMemory, CoachMessage } from "@/types/coach";
import { buildMemory, checkinReply, coachGreeting, coachReply, reminderIcs } from "./coach";
import { PRESETS, TECHNIQUE_BY_TAG } from "./data";
import {
  addCheckin, forgetEverything, listSessions, loadCoachThread, loadProfile, saveCoachThread, saveProfile, saveSession,
  DEFAULT_PROFILE, type KV,
} from "./storage";
import type { Session } from "./types";

const EMPTY: CoachMemory = { child: null, rehearsals: 0, calmReached: 0, lastSession: null, plan: null, planCheckedIn: false, struggle: null };
const NOW = new Date(2026, 10, 15, 13, 15);
const YESTERDAY = new Date(2026, 10, 14, 20, 0);
const THREAT_STORY = "He screamed about brushing teeth, so I told him: If you don't brush right now, no iPad tomorrow! It got worse.";

function coach(message: CoachMessage) {
  if (message.role !== "coach") throw new Error("expected a coach message");
  return message;
}

function memoryKV(): KV {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } };
}

function sessionWithThreat(): Session {
  const scenario = PRESETS[0];
  return {
    version: 1, id: randomUUID(), createdAt: YESTERDAY.toISOString(), scenario, difficulty: "normal", startMood: 30, mood: 35,
    status: "ended", outcome: "ended_by_parent",
    turns: [{
      index: 0, parentText: "If you don't brush right now, no iPad tomorrow!", moodBefore: 50, moodAfter: 35, delta: -15,
      childReply: "NO!", source: "fallback", tags: [{ tag: "threat", evidence: "no iPad", weight: -15, applied: -15 }],
    }],
  };
}

describe("coachReply", () => {
  it("names the threat, suggests a better technique and offers a rehearsal", () => {
    const reply = coachReply(THREAT_STORY, EMPTY, NOW);
    expect(reply.kind).toBe("message");
    const m = coach(reply.message);
    expect(TECHNIQUE_BY_TAG.threat.betterWith).toContain(m.technique);
    expect(m.lines.some((line) => line.includes(copy.coach.negNote.threat))).toBe(true);
    expect(m.rehearse).toBe(THREAT_STORY);
  });

  it("catches what parents describe in their own words, not only direct speech", () => {
    const threat = coach(coachReply("Bedtime is a battle every night. I end up threatening to take the iPad away.", EMPTY, NOW).message);
    expect(threat.lines).toContain(copy.coach.noticedPlain.threat);
    const yelling = coach(coachReply("Getting dressed for daycare takes forever and I keep yelling.", EMPTY, NOW).message);
    expect(yelling.lines).toContain(copy.coach.noticedPlain.yell_or_insult);
  });

  it("gives an example that fits the moment", () => {
    const m = coach(coachReply("Leaving the playground ends in tears. I end up threatening to leave without him.", EMPTY, NOW).message);
    expect(m.technique).toBe("offer_choice");
    expect(m.lines).toContain(copy.coach.example("One more slide or two more swings, then we go?"));
  });

  it("does not blame the parent for the child's screaming", () => {
    const m = coach(coachReply("He screamed at his sister and threw his shoes across the hall.", EMPTY, NOW).message);
    const blame: string[] = Object.values(copy.coach.noticedPlain);
    expect(m.lines.some((line) => blame.includes(line))).toBe(false);
  });

  it("takes every explanation and source from techniques.json", () => {
    const m = coach(coachReply(THREAT_STORY, EMPTY, NOW).message);
    const technique = TECHNIQUE_BY_TAG[m.technique ?? "name_feeling"];
    expect(m.lines.some((line) => line.includes(technique.why))).toBe(true);
    expect(technique.source.url).toMatch(/^https:\/\//);
  });

  it("sends crisis words to the safety notice instead of advice", () => {
    const reply = coachReply("I can't do this anymore, I want to die.", EMPTY, NOW);
    expect(reply.kind).toBe("safety");
    if (reply.kind === "safety") expect(reply.safety).toBe("parent_crisis");
    expect(coach(reply.message).rehearse).toBeUndefined();
  });

  it("asks for more when the message is too short to coach", () => {
    const m = coach(coachReply("bedtime", EMPTY, NOW).message);
    expect(m.lines).toEqual([copy.coach.tooShort]);
    expect(m.rehearse).toBeUndefined();
  });

  it("praises what already worked and suggests something new", () => {
    const m = coach(coachReply("I said you're really mad that it's bedtime, huh? He still cried for twenty minutes.", EMPTY, NOW).message);
    expect(m.lines).toContain(copy.coach.praised(copy.coach.posDone.name_feeling));
    expect(m.technique).not.toBe("name_feeling");
  });

  it("remembers a habit that keeps coming up", () => {
    const m = coach(coachReply(THREAT_STORY, { ...EMPTY, struggle: "threat" }, NOW).message);
    expect(m.lines).toContain(copy.coach.again);
  });

  it("answers the same words the same way", () => {
    expect(coachReply(THREAT_STORY, EMPTY, NOW)).toEqual(coachReply(THREAT_STORY, EMPTY, NOW));
  });
});

describe("coachGreeting", () => {
  it("opens the first visit by saying Sebastian is an AI, not a therapist", () => {
    const [first] = coachGreeting(EMPTY, true, NOW);
    expect(coach(first).lines).toEqual([copy.coach.disclosure]);
  });

  it("asks about yesterday's plan the next day", () => {
    const memory: CoachMemory = { ...EMPTY, child: { name: "Max", ageYears: 4, temperament: "strong-willed" }, plan: { sessionId: "s1", phrase: "Top teeth first?", createdAt: YESTERDAY.toISOString() } };
    const [greeting] = coachGreeting(memory, false, NOW);
    expect(coach(greeting).checkin).toBe("s1");
    expect(coach(greeting).lines[0]).toBe(copy.coach.greetCheckin("Max", "Top teeth first?"));
  });

  it("does not ask how a plan went on the day it was made", () => {
    const memory: CoachMemory = { ...EMPTY, plan: { sessionId: "s1", phrase: "Top teeth first?", createdAt: NOW.toISOString() } };
    const [greeting] = coachGreeting(memory, false, NOW);
    expect(coach(greeting).checkin).toBeUndefined();
  });

  it("welcomes a returning parent back to their last rehearsal", () => {
    const memory: CoachMemory = { ...EMPTY, lastSession: { scenarioId: "leaving-playground", title: "Leaving the playground", outcome: "calm_reached" } };
    expect(coach(coachGreeting(memory, false, NOW)[0]).lines[0]).toBe(copy.coach.greetBack("Leaving the playground"));
  });

  it("replies to each check-in answer", () => {
    expect(coach(checkinReply("didnt", NOW)).lines).toEqual([copy.coach.checkinReply.didnt]);
  });
});

describe("buildMemory and browser storage", () => {
  it("remembers the child, the rehearsals, the plan and the habit to work on", () => {
    const kv = memoryKV();
    saveProfile({ ...DEFAULT_PROFILE, childName: "Leo", ageYears: 5 }, kv);
    const session = sessionWithThreat();
    saveSession(session, kv);
    const memory = buildMemory({
      profile: loadProfile(kv), sessions: listSessions(kv), checkins: [],
      plan: { sessionId: session.id, createdAt: YESTERDAY.toISOString(), phrases: [{ phrase: "Top teeth first?", technique: "offer_choice" }] },
    });
    expect(memory.child).toEqual({ name: "Leo", ageYears: 5, temperament: "strong-willed" });
    expect(memory.rehearsals).toBe(1);
    expect(memory.struggle).toBe("threat");
    expect(memory.plan?.phrase).toBe("Top teeth first?");
    expect(memory.planCheckedIn).toBe(false);
  });

  it("forgets everything on request", () => {
    const kv = memoryKV();
    saveProfile(DEFAULT_PROFILE, kv);
    saveSession(sessionWithThreat(), kv);
    addCheckin({ date: "2026-11-15", sessionId: "s1", result: "worked" }, kv);
    saveCoachThread(coachGreeting(EMPTY, true, NOW), kv);
    expect(loadCoachThread(kv)).toHaveLength(2);

    forgetEverything(kv);
    expect(loadProfile(kv)).toBeNull();
    expect(listSessions(kv)).toEqual([]);
    expect(loadCoachThread(kv)).toEqual([]);
  });
});

describe("reminderIcs", () => {
  it("makes a daily 7 pm local reminder that calendars accept", () => {
    const ics = reminderIcs("https://meltdown-flame.vercel.app/coach", NOW);
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("DTSTART:20261115T190000");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics).toContain("URL:https://meltdown-flame.vercel.app/coach");
  });
});

describe("Sebastian in Russian", () => {
  const RU = textsFor("ru");

  it("understands a Russian story and answers in Russian", () => {
    const m = coach(coachReply("Каждый вечер укладывание превращается в битву. В итоге я угрожаю забрать iPad.", EMPTY, NOW, RU).message);
    expect(m.lines).toContain(RU.copy.coach.noticedPlain.threat);
    expect(m.technique).toBe("when_then");
    expect(m.preset).toBe("teeth-bedtime");
    expect(m.lines.some((line) => line.includes(RU.technique("when_then").why))).toBe(true);
  });

  it("catches Russian crisis words, which the English-only safety check would miss", () => {
    expect(coachReply("Я больше не могу, я не хочу жить.", EMPTY, NOW, RU).kind).toBe("safety");
    const hit = coachReply("Вчера я ударила его, потому что он не слушался.", EMPTY, NOW, RU);
    expect(hit.kind === "safety" && hit.safety).toBe("child_at_risk");
  });

  it("does not raise an alarm when the parent says they did not hit", () => {
    expect(coachReply("Я очень злилась, но я не ударила его, просто ушла в другую комнату.", EMPTY, NOW, RU).kind).toBe("message");
  });

  it("translates technique and scenario names for the screen only", () => {
    expect(RU.technique("threat").label).toBe("Угроза");
    expect(RU.scenario({ id: "teeth-bedtime", title: "Brushing teeth at bedtime", setting: "Bathroom" }).title).toBe("Чистка зубов перед сном");
    expect(RU.scenario({ id: "custom-1", title: "A hard moment", setting: "At home" })).toEqual({ title: "Трудный момент", setting: "Дома" });
    expect(textsFor("en").technique("threat").label).toBe(TECHNIQUE_BY_TAG.threat.label);
  });

  it("greets in Russian with the translated scenario title", () => {
    const memory: CoachMemory = { ...EMPTY, lastSession: { scenarioId: "teeth-bedtime", title: "Brushing teeth at bedtime", outcome: "ended_by_parent" } };
    expect(coach(coachGreeting(memory, false, NOW, RU)[0]).lines[0]).toBe(RU.copy.coach.greetBack("Чистка зубов перед сном"));
  });
});
