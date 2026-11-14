"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { copy } from "@/content/copy";
import { createSession } from "@/hooks/useSession";
import { track } from "@/lib/analytics";
import { postScenario, RateLimitedError } from "@/lib/api-client";
import { buildMemory, checkinReply, coachGreeting, coachReply, reminderIcs } from "@/lib/coach";
import { localDate } from "@/lib/progress";
import {
  addCheckin, DEFAULT_PROFILE, forgetEverything, listSessions, loadCheckins, loadCoachThread, loadPlan, loadProfile,
  saveCoachThread, type Checkin,
} from "@/lib/storage";
import type { CoachMemory, CoachMessage } from "@/types/coach";

const DAY_MS = 86_400_000;
/** Pause before Sebastian answers, so the reply reads as a reply and not as a page change. */
const REPLY_DELAY_MS = 700;

function readMemory(): CoachMemory {
  return buildMemory({ profile: loadProfile(), sessions: listSessions(), plan: loadPlan(), checkins: loadCheckins() });
}

/** `?morning=1` jumps a day ahead, so the demo can show the next-morning check-in. */
function clock(): Date {
  const morning = new URLSearchParams(window.location.search).has("morning");
  return new Date(Date.now() + (morning ? DAY_MS : 0));
}

/** Today's thread: yesterday's messages stay, and a new day starts with a fresh greeting. */
function openThread(memory: CoachMemory, now: Date): CoachMessage[] {
  const stored = loadCoachThread();
  const last = stored.at(-1);
  if (last && localDate(new Date(last.at)) === localDate(now)) return stored;
  return [...stored, ...coachGreeting(memory, stored.length === 0, now)];
}

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** Sebastian's chat. Mount only after useHydrated(): the initial state reads localStorage. */
export function useCoach() {
  const router = useRouter();
  const [memory, setMemory] = useState<CoachMemory>(readMemory);
  const [messages, setMessages] = useState<CoachMessage[]>(() => openThread(memory, clock()));
  const [today] = useState(() => localDate(clock()));
  const [typing, setTyping] = useState(false);
  const [rehearsing, setRehearsing] = useState(false);
  const [safety, setSafety] = useState<"child_at_risk" | "parent_crisis" | null>(null);
  const [reminded, setReminded] = useState(false);

  function commit(next: CoachMessage[]) {
    setMessages(next);
    saveCoachThread(next);
  }

  async function send(text: string): Promise<boolean> {
    if (typing || rehearsing) return false;
    const withParent: CoachMessage[] = [...messages, { role: "parent", at: clock().toISOString(), text }];
    commit(withParent);
    setTyping(true);
    await wait(REPLY_DELAY_MS);
    const reply = coachReply(text, memory, clock());
    commit([...withParent, reply.message]);
    setTyping(false);
    if (reply.kind === "safety") {
      setSafety(reply.safety);
      track("safety_shown", { kind: reply.safety });
    }
    return true;
  }

  function checkin(sessionId: string, result: Checkin["result"]) {
    const now = clock();
    addCheckin({ date: localDate(now), sessionId, result });
    track("checkin", { result });
    setMemory(readMemory());
    const label = { worked: copy.progress.worked, partly: copy.progress.partly, didnt: copy.progress.didnt }[result];
    commit([...messages, { role: "parent", at: now.toISOString(), text: label }, checkinReply(result, now)]);
  }

  async function rehearse(text: string) {
    if (rehearsing) return;
    setRehearsing(true);
    const profile = loadProfile() ?? DEFAULT_PROFILE;
    try {
      const { result, source } = await postScenario({
        text, childName: profile.childName, ageYears: profile.ageYears, temperament: profile.temperament,
      });
      track("scenario_result", { kind: result.kind, source });
      if (result.kind === "ok") {
        const session = createSession(result.scenario);
        track("start_practice", { source: "custom", ageGroup: result.scenario.ageGroup });
        router.push(`/practice/${session.id}`);
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
    const file = new Blob([reminderIcs(`${window.location.origin}/coach`, new Date())], { type: "text/calendar" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "meltdown-reminder.ics";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setReminded(true);
  }

  function forget() {
    forgetEverything();
    const fresh = readMemory();
    setMemory(fresh);
    setMessages(coachGreeting(fresh, true, clock()));
    setReminded(false);
  }

  return {
    memory, messages, today, typing, rehearsing, safety, reminded,
    pendingCheckin: memory.plan && !memory.planCheckedIn ? memory.plan.sessionId : null,
    send, checkin, rehearse, remind, forget,
    closeSafety: () => setSafety(null),
  };
}
