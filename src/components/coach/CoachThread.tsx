"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SebastianAvatar } from "@/components/SebastianAvatar";
import { copy } from "@/content/copy";
import { TECHNIQUE_BY_TAG } from "@/lib/data";
import { localDate } from "@/lib/progress";
import type { Checkin } from "@/lib/storage";
import type { PositiveTag } from "@/lib/types";
import type { CoachMessage } from "@/types/coach";

interface CoachThreadProps {
  messages: CoachMessage[];
  typing: boolean;
  /** Local date of "today", so dividers can say Today without reading the clock in render. */
  today: string;
  /** Session id of the plan still waiting for its check-in. */
  pendingCheckin: string | null;
  rehearsing: boolean;
  onCheckin(sessionId: string, result: Checkin["result"]): void;
  onRehearse(text: string): void;
}

const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });
const CHECKIN_ANSWERS: { result: Checkin["result"]; label: string }[] = [
  { result: "worked", label: copy.progress.worked },
  { result: "partly", label: copy.progress.partly },
  { result: "didnt", label: copy.progress.didnt },
];

export function CoachThread({ messages, typing, today, pendingCheckin, rehearsing, onCheckin, onRehearse }: CoachThreadProps) {
  const end = useRef<HTMLLIElement>(null);
  const seen = useRef(messages.length);
  useEffect(() => {
    // Follow new messages, but leave the page where it is on first open.
    if (messages.length === seen.current && !typing) return;
    seen.current = messages.length;
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages.length, typing]);

  return (
    <ol className="coach-thread" aria-live="polite">
      {messages.map((m, i) => {
        const day = localDate(new Date(m.at));
        const prev = messages[i - 1];
        const divider = !prev || localDate(new Date(prev.at)) !== day;
        const lastOfGroup = messages[i + 1]?.role !== "coach";
        return (
          <DayGroup key={`${m.at}-${i}`} label={divider ? (day === today ? copy.coach.today : dayLabel.format(new Date(m.at))) : null}>
            {m.role === "parent" ? (
              <li className="msg msg-parent"><div className="bubble bubble-parent">{m.text}</div></li>
            ) : (
              <CoachBubble avatar={lastOfGroup} lines={m.lines}>
                {m.technique && <TechniqueSource tag={m.technique} />}
                {m.rehearse && (
                  <button type="button" className="btn btn-primary justify-self-start" disabled={rehearsing} onClick={() => m.rehearse && onRehearse(m.rehearse)}>
                    {rehearsing ? copy.coach.rehearsing : copy.coach.rehearse}
                  </button>
                )}
                {m.checkin && m.checkin === pendingCheckin && (
                  <div className="flex flex-wrap gap-2">
                    {CHECKIN_ANSWERS.map((a) => (
                      <button key={a.result} type="button" className="chip-btn" onClick={() => m.checkin && onCheckin(m.checkin, a.result)}>{a.label}</button>
                    ))}
                  </div>
                )}
              </CoachBubble>
            )}
          </DayGroup>
        );
      })}
      {typing && (
        <li className="coach-row">
          <SebastianAvatar size={32} decorative />
          <div className="bubble bubble-coach typing" role="status" aria-label={copy.coach.typing}><i /><i /><i /></div>
        </li>
      )}
      <li ref={end} aria-hidden="true" className="thread-end" />
    </ol>
  );
}

function DayGroup({ label, children }: { label: string | null; children: ReactNode }) {
  return (
    <>
      {label && <li className="day-divider"><span>{label}</span></li>}
      {children}
    </>
  );
}

function CoachBubble({ avatar, lines, children }: { avatar: boolean; lines: string[]; children?: ReactNode }) {
  return (
    <li className="coach-row">
      <span className="coach-row-avatar">{avatar && <SebastianAvatar size={32} decorative />}</span>
      <div className="bubble bubble-coach">
        {lines.map((line, i) => <p key={i}>{line}</p>)}
        {children}
      </div>
    </li>
  );
}

/** The suggested technique with its source, straight from techniques.json. */
function TechniqueSource({ tag }: { tag: PositiveTag }) {
  const technique = TECHNIQUE_BY_TAG[tag];
  return (
    <div className="technique-note">
      <span className="font-semibold">{copy.coach.trySource(technique.label)}</span>
      <a href={technique.source.url} target="_blank" rel="noopener noreferrer">{copy.coach.source}: {technique.source.name}</a>
    </div>
  );
}
