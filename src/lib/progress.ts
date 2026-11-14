import { TECHNIQUE_BY_TAG } from "./data";
import type { Session } from "./types";

/** "YYYY-MM-DD" in the device's local time zone. */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Consecutive days with a rehearsal, ending today or yesterday (SPEC 14.7). */
export function streakDays(sessions: Pick<Session, "createdAt" | "turns">[], today: Date): number {
  const days = new Set(sessions.filter((s) => s.turns.length > 0).map((s) => localDate(new Date(s.createdAt))));
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDate(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export interface First30 { rehearsals: number; calmReached: number; bestPhrases: string[] }

/** Numbers for the pricing "Your first 30 days" block. Best phrases: biggest positive deltas, no negative tags. */
export function first30Stats(sessions: Session[]): First30 {
  const practiced = sessions.filter((s) => s.turns.length > 0);
  const phrases = practiced
    .flatMap((s) => s.turns)
    .filter((t) => t.delta > 0 && t.tags.every((g) => TECHNIQUE_BY_TAG[g.tag].polarity === "positive"))
    .sort((a, b) => b.delta - a.delta)
    .map((t) => t.parentText);
  return {
    rehearsals: practiced.length,
    calmReached: practiced.filter((s) => s.outcome === "calm_reached").length,
    bestPhrases: [...new Set(phrases)].slice(0, 3),
  };
}
