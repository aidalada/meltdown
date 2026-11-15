"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTexts } from "@/content/i18n";
import type { Texts } from "@/content/locale";
import { createSession } from "@/hooks/useSession";
import { track } from "@/lib/analytics";
import { postScenario, RateLimitedError } from "@/lib/api-client";
import { rangeOf, yearsForChoice, type AgeChoice } from "@/lib/age";
import { ageReply, buildMemory, checkinReply, coachGreeting, coachReply, extractChild, mergeChildFacts, reminderIcs } from "@/lib/coach";
import { askCoach, coachRequest } from "@/lib/coach-client";
import { ageGroupOf, PRESETS } from "@/lib/data";
import { localDate } from "@/lib/progress";
import {
  addCheckin, DEFAULT_PROFILE, forgetEverything, listSessions, loadCheckins, loadChildFacts, loadCoachThread, loadPlan, loadProfile,
  saveChildFacts, saveCoachThread, saveProfile, type Checkin,
} from "@/lib/storage";
import type { Scenario } from "@/lib/types";
import type { CoachMemory, CoachMessage } from "@/types/coach";

const DAY_MS = 86_400_000;
/** Pause before Sebastian answers, so the reply reads as a reply and not as a page change. */
const REPLY_DELAY_MS = 700;

function readMemory(profile = loadProfile(), facts = loadChildFacts()): CoachMemory {
  return buildMemory({ profile, sessions: listSessions(), plan: loadPlan(), checkins: loadCheckins(), facts });
}

/** `?morning=1` jumps a day ahead, so the demo can show the next-morning check-in. */
function clock(): Date {
  const morning = new URLSearchParams(window.location.search).has("morning");
  return new Date(Date.now() + (morning ? DAY_MS : 0));
}

/** Today's thread: yesterday's messages stay, and a new day starts with a fresh greeting. */
function openThread(memory: CoachMemory, now: Date, texts: Texts): CoachMessage[] {
  const stored = loadCoachThread();
  const last = stored.at(-1);
  if (last && localDate(new Date(last.at)) === localDate(now)) return stored;
  return [...stored, ...coachGreeting(memory, stored.length === 0, now, texts)];
}

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/**
 * Sebastian's chat. Mount only after useHydrated(): the initial state reads localStorage.
 * Remount it when the language changes, so the greeting is rebuilt in that language.
 */
export function useCoach() {
  const texts = useTexts();
  const { copy } = texts;
  const router = useRouter();
  const [memory, setMemory] = useState<CoachMemory>(readMemory);
  const [messages, setMessages] = useState<CoachMessage[]>(() => openThread(memory, clock(), texts));
  const [today] = useState(() => localDate(clock()));
  const [typing, setTyping] = useState(false);
  const [rehearsing, setRehearsing] = useState(false);
  const [safety, setSafety] = useState<"child_at_risk" | "parent_crisis" | null>(null);
  const [reminded, setReminded] = useState(false);
  const memoryVersion = useRef(0);

  function commit(next: CoachMessage[]) {
    setMessages(next);
    saveCoachThread(next);
  }

  async function send(text: string): Promise<boolean> {
    if (typing || rehearsing) return false;
    const version = memoryVersion.current;
    const now = clock();
    const withParent: CoachMessage[] = [...messages, { role: "parent", at: now.toISOString(), text }];
    commit(withParent);
    setTyping(true);
    // The local coach always answers first: it runs the safety check and is the fallback.
    const local = coachReply(text, memory, now, texts);
    const found = local.kind === "message" ? extractChild(text) : {};
    const proposed = local.kind === "message" ? mergeChildFacts(found, loadProfile() ?? DEFAULT_PROFILE, loadChildFacts()) : null;
    // Give the model the current context, but save proposed facts only after both safety checks.
    const known = proposed?.changed ? readMemory(proposed.profile, proposed.facts) : memory;
    // Only a real story goes to the model: never crisis words, never a too-short message.
    const story = local.kind === "message" && local.message.role === "coach" && local.message.rehearse !== undefined;
    const [ai] = await Promise.all([
      story ? askCoach(coachRequest(text, texts.locale, known, messages)) : null,
      wait(REPLY_DELAY_MS),
    ]);
    if (version !== memoryVersion.current) return false;
    let message = local.message;
    let safety = local.kind === "safety" ? local.safety : null;
    if (ai && ai.safety !== "none") {
      safety = ai.safety;
      message = { role: "coach", at: clock().toISOString(), lines: [copy.coach.safetyLine] };
    } else if (ai && local.message.role === "coach") {
      // The model's words and choice of technique; the why and the source still come from techniques.json.
      message = { ...local.message, lines: [ai.lead], technique: ai.technique, say: ai.say, preset: ai.preset ?? local.message.preset };
    }
    if (safety === null && proposed?.changed) {
      saveProfile(proposed.profile);
      saveChildFacts(proposed.facts);
      setMemory(readMemory());
      if ((found.name || found.ageYears) && message.role === "coach") {
        message = { ...message, remembered: copy.coach.rememberedChild(found.name ?? null, found.ageYears ?? null) };
      }
    }
    if (story) track("coach_reply", { source: ai ? "ai" : "fallback" });
    commit([...withParent, message]);
    setTyping(false);
    if (safety) {
      setSafety(safety);
      track("safety_shown", { kind: safety });
    }
    return true;
  }

  function checkin(sessionId: string, result: Checkin["result"]) {
    const now = clock();
    addCheckin({ date: localDate(now), sessionId, result });
    track("checkin", { result });
    setMemory(readMemory());
    commit([...messages, { role: "parent", at: now.toISOString(), text: copy.progress[result] }, checkinReply(result, now, texts)]);
  }

  /** The parent answers Sebastian's age question with one tap; the answer is kept in the browser profile. */
  function pickAge(choice: AgeChoice) {
    const now = clock();
    const profile = loadProfile() ?? DEFAULT_PROFILE;
    saveProfile({ ...profile, ageYears: yearsForChoice(choice, profile.ageYears) });
    setMemory(readMemory());
    commit([...messages, { role: "parent", at: now.toISOString(), text: copy.setup.ageRange(rangeOf(choice)) }, ageReply(now, texts)]);
  }

  function begin(scenario: Scenario) {
    const session = createSession(scenario);
    track("start_practice", {
      source: scenario.source,
      ageGroup: scenario.ageGroup,
      ...(scenario.source === "preset" ? { scenarioId: scenario.id } : {}),
    });
    router.push(`/practice/${session.id}`);
  }

  /**
   * English: the parent's own words become a custom scenario (AI on prod, heuristics offline).
   * Russian: the practice child speaks English, so Sebastian starts the matching preset instead.
   */
  async function rehearse(text: string, presetId?: string) {
    if (rehearsing) return;
    setRehearsing(true);
    const profile = loadProfile() ?? DEFAULT_PROFILE;
    const preset = texts.locale === "ru" ? PRESETS.find((p) => p.id === presetId) : undefined;
    if (preset) {
      begin({ ...preset, childName: profile.childName, ageYears: profile.ageYears, ageGroup: ageGroupOf(profile.ageYears), temperament: profile.temperament });
      return;
    }
    try {
      const { result, source } = await postScenario({
        text, childName: profile.childName, ageYears: profile.ageYears, temperament: profile.temperament,
      });
      track("scenario_result", { kind: result.kind, source });
      if (result.kind === "ok") {
        begin(result.scenario);
        return;
      }
      if (result.kind === "safety") {
        setSafety(result.safety);
        track("safety_shown", { kind: result.safety });
      } else {
        commit([...messages, { role: "coach", at: clock().toISOString(), lines: [copy.coach.offTopic] }]);
      }
    } catch (e) {
      const line = e instanceof RateLimitedError ? copy.rehearsal.rateLimited : copy.coach.offTopic;
      commit([...messages, { role: "coach", at: clock().toISOString(), lines: [line] }]);
    }
    setRehearsing(false);
  }

  function remind() {
    const file = new Blob([reminderIcs(`${window.location.origin}/coach`, new Date(), texts, memory)], { type: "text/calendar" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "meltdown-reminder.ics";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setReminded(true);
  }

  function forget() {
    memoryVersion.current++;
    forgetEverything();
    const fresh = readMemory();
    setMemory(fresh);
    setMessages(coachGreeting(fresh, true, clock(), texts));
    setTyping(false);
    setReminded(false);
  }

  return {
    memory, messages, today, typing, rehearsing, safety, reminded,
    pendingCheckin: memory.plan && !memory.planCheckedIn ? memory.plan.sessionId : null,
    /** True until Sebastian knows the child's age. */
    pendingAge: memory.child === null,
    send, checkin, pickAge, rehearse, remind, forget,
    closeSafety: () => setSafety(null),
  };
}
