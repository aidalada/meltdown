import type { NegativeTag, Outcome, PositiveTag, Temperament } from "@/lib/types";

export type ChildGender = "girl" | "boy";

/** One message in the coach thread. Stored in this browser only. */
export type CoachMessage =
  | { role: "parent"; at: string; text: string }
  | {
      role: "coach";
      at: string;
      lines: string[];
      /** Technique Sebastian suggests; its source comes from techniques.json. */
      technique?: PositiveTag;
      /** A phrase the parent can say instead (English: the practice child is American). */
      say?: string;
      /** The harmful habit in this story also showed up in past rehearsals. */
      again?: boolean;
      /** The parent's own words, ready to become a rehearsal scenario. */
      rehearse?: string;
      /** Session id of the saved plan this message asks about. */
      checkin?: string;
      /** Sebastian asks the child's age here; the chat shows the age buttons under it. */
      askAge?: boolean;
      /** Preset matching the moment, used to start a rehearsal without the API (Russian input). */
      preset?: string;
      /** What Sebastian just learned about the child from this message, e.g. "Jessica, 7". */
      remembered?: string;
    };

/** What Sebastian knows, derived from the browser's own records. Nothing here leaves the device. */
export interface CoachMemory {
  child: {
    name: string;
    ageYears: number;
    temperament: Temperament;
    /** False while the name is still the practice name; Sebastian then says "your child". */
    named: boolean;
    gender: ChildGender | null;
  } | null;
  rehearsals: number;
  calmReached: number;
  lastSession: { scenarioId: string; title: string; outcome: Outcome } | null;
  plan: { sessionId: string; phrase: string; createdAt: string } | null;
  planCheckedIn: boolean;
  /** Most frequent harmful habit across rehearsals, if any. */
  struggle: NegativeTag | null;
}

export type CoachReply =
  | { kind: "safety"; safety: "child_at_risk" | "parent_crisis"; message: CoachMessage }
  | { kind: "message"; message: CoachMessage };
