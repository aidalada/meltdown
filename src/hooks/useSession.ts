"use client";

import { useCallback, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { postTurn, RateLimitedError } from "@/lib/api-client";
import { HARD_START_OFFSET, MAX_HISTORY_ITEMS, START_MOOD } from "@/lib/constants";
import { clamp } from "@/lib/engine/mood";
import { ensureTrialStarted, loadSession, saveSession } from "@/lib/storage";
import type { Difficulty, HistoryItem, Outcome, Safety, Scenario, Session, Source } from "@/lib/types";

/** Creates and stores a new session (SPEC 14.2). Call from event handlers only. */
export function createSession(scenario: Scenario, difficulty: Difficulty = "normal"): Session {
  const startMood = clamp(START_MOOD[scenario.temperament] + (difficulty === "hard" ? HARD_START_OFFSET : 0), 0, 100);
  const session: Session = {
    version: 1,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    scenario,
    difficulty,
    startMood,
    mood: startMood,
    turns: [],
    status: "active",
    outcome: "continue",
  };
  saveSession(session);
  ensureTrialStarted();
  return session;
}

export interface UseSession {
  session: Session | null;
  status: "loading" | "ready" | "not_found";
  pending: boolean;
  pendingText: string | null;
  lastSource: Source | null;
  safety: Safety;
  error: string | null;
  sendTurn(text: string): Promise<boolean>;
  endSession(outcome?: Outcome): void;
  dismissSafety(): void;
}

/**
 * SPEC 11.3. Mount only after useHydrated() is true: the session is read from localStorage
 * in the state initializer. onReply runs with the child's reply (voice).
 */
export function useSession(id: string, onReply?: (reply: string) => void): UseSession {
  const [session, setSession] = useState<Session | null>(() => loadSession(id));
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<Source | null>(() => {
    const turns = loadSession(id)?.turns ?? [];
    return turns.length ? turns[turns.length - 1].source : null;
  });
  const [safety, setSafety] = useState<Safety>("none");
  const [error, setError] = useState<string | null>(null);
  const current = useRef(session);
  const busy = useRef(false);

  const commit = useCallback((next: Session) => {
    saveSession(next);
    current.current = next;
    setSession(next);
  }, []);

  const sendTurn = useCallback(async (raw: string): Promise<boolean> => {
    const s = current.current;
    const text = raw.trim();
    if (busy.current || !s || s.status !== "active" || !text) return false;
    busy.current = true;
    setPendingText(text);
    setError(null);
    const history: HistoryItem[] = [
      { role: "child" as const, text: s.scenario.openingLine },
      ...s.turns.flatMap((t) => [
        { role: "parent" as const, text: t.parentText },
        { role: "child" as const, text: t.childReply },
      ]),
    ].slice(-MAX_HISTORY_ITEMS);
    const prevTags = s.turns.length ? s.turns[s.turns.length - 1].tags.map((t) => t.tag) : [];
    try {
      const { result, source } = await postTurn({
        scenario: s.scenario, difficulty: s.difficulty, mood: s.mood, turnIndex: s.turns.length,
        history, parentText: text, prevTags,
      });
      const next: Session = {
        ...s,
        turns: [...s.turns, result.turn],
        mood: result.turn.moodAfter,
        outcome: result.outcome,
        status: result.outcome === "continue" ? "active" : "ended",
      };
      commit(next);
      setLastSource(source);
      track("turn_completed", { turnIndex: result.turn.index, delta: result.turn.delta, source, tagsCount: result.turn.tags.length });
      if (next.status === "ended") track("session_completed", { outcome: next.outcome, turns: next.turns.length });
      if (result.safety !== "none") {
        setSafety(result.safety);
        track("safety_shown", { kind: result.safety });
      }
      onReply?.(result.turn.childReply);
      return true;
    } catch (e) {
      setError(e instanceof RateLimitedError ? "rate_limited" : "failed");
      return false;
    } finally {
      busy.current = false;
      setPendingText(null);
    }
  }, [commit, onReply]);

  const endSession = useCallback((outcome: Outcome = "ended_by_parent") => {
    const s = current.current;
    if (!s) return;
    if (s.status === "ended") return;
    commit({ ...s, status: "ended", outcome });
    track("session_completed", { outcome, turns: s.turns.length });
  }, [commit]);

  const dismissSafety = useCallback(() => setSafety("none"), []);

  return {
    session,
    status: session ? "ready" : "not_found",
    pending: pendingText !== null,
    pendingText,
    lastSource,
    safety,
    error,
    sendTurn,
    endSession,
    dismissSafety,
  };
}
