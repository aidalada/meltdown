"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AgePicker } from "@/components/AgePicker";
import { Disclosure } from "@/components/Disclosure";
import { Icon } from "@/components/Icon";
import { SebastianAvatar } from "@/components/SebastianAvatar";
import { useCopy, useLocale, useTexts } from "@/content/i18n";
import { TECHNIQUE_BY_TAG } from "@/lib/data";
import { localDate } from "@/lib/progress";
import type { Checkin } from "@/lib/storage";
import type { AgeChoice } from "@/lib/age";
import type { PositiveTag } from "@/lib/types";
import type { CoachMessage } from "@/types/coach";

interface CoachThreadProps {
  messages: CoachMessage[];
  typing: boolean;
  /** Local date of "today", so dividers can say Today without reading the clock in render. */
  today: string;
  /** Session id of the plan still waiting for its check-in. */
  pendingCheckin: string | null;
  /** True while Sebastian still waits for the child's age. */
  pendingAge: boolean;
  rehearsing: boolean;
  onPickAge(choice: AgeChoice): void;
  onCheckin(sessionId: string, result: Checkin["result"]): void;
  onRehearse(text: string, preset?: string): void;
}

const DAY_LABEL = {
  en: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }),
  ru: new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }),
};
const CHECKIN_ANSWERS: Checkin["result"][] = ["worked", "partly", "didnt"];

export function CoachThread({ messages, typing, today, pendingCheckin, pendingAge, rehearsing, onPickAge, onCheckin, onRehearse }: CoachThreadProps) {
  const copy = useCopy();
  const locale = useLocale();
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
          <DayGroup key={`${m.at}-${i}`} label={divider ? (day === today ? copy.coach.today : DAY_LABEL[locale].format(new Date(m.at))) : null}>
            {m.role === "parent" ? (
              <li className="msg msg-parent"><div className="bubble bubble-parent">{m.text}</div></li>
            ) : (
              <CoachBubble avatar={lastOfGroup} lines={m.lines}>
                {m.again && <span className="memory-chip"><Icon name="repeat" size={14} />{copy.coach.againShort}</span>}
                {m.technique && <SayCard tag={m.technique} say={m.say} />}
                {(m.rehearse || m.technique) && (
                  <Disclosure>
                    <div className="flex flex-wrap items-center gap-2">
                      {m.rehearse && (
                        <button type="button" className="btn btn-primary" disabled={rehearsing} onClick={() => m.rehearse && onRehearse(m.rehearse, m.preset)}>
                          <Icon name="play" size={18} />
                          {rehearsing ? copy.coach.rehearsing : copy.coach.rehearse}
                        </button>
                      )}
                      {m.technique && <Disclosure.Button>{copy.coach.why}</Disclosure.Button>}
                    </div>
                    {m.technique && <Disclosure.Panel><WhyItWorks tag={m.technique} /></Disclosure.Panel>}
                  </Disclosure>
                )}
                {m.askAge && pendingAge && <AgePicker variant="chips" value={null} onPick={onPickAge} />}
                {m.checkin && m.checkin === pendingCheckin && (
                  <div className="flex flex-wrap gap-2">
                    {CHECKIN_ANSWERS.map((result) => (
                      <button key={result} type="button" className="chip-btn" onClick={() => m.checkin && onCheckin(m.checkin, result)}>{copy.progress[result]}</button>
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

/** What to say instead, in a card that stands out from the chat text. Falls back to the short tip. */
function SayCard({ tag, say }: { tag: PositiveTag; say?: string }) {
  const { copy, technique } = useTexts();
  const text = technique(tag);
  return (
    <div className="say-card">
      <p className="say-label"><Icon name="say" size={16} />{say ? copy.coach.sayLabel : copy.coach.tipLabel}</p>
      <p className="say-phrase">{say ? `“${say}”` : text.shortTip}</p>
      <p className="say-technique">{text.label}</p>
    </div>
  );
}

/** The tip, the reason and the source, straight from techniques.json (CLAUDE.md rule 6). */
function WhyItWorks({ tag }: { tag: PositiveTag }) {
  const { copy, technique } = useTexts();
  const text = technique(tag);
  const { source } = TECHNIQUE_BY_TAG[tag];
  return (
    <div className="grid gap-1.5 text-[15px]">
      <p className="font-semibold">{copy.coach.tryThis(text.shortTip)}</p>
      <p className="text-muted">{text.why}</p>
      <a className="text-[13px]" href={source.url} target="_blank" rel="noopener noreferrer">{copy.coach.source}: {source.name}</a>
    </div>
  );
}
