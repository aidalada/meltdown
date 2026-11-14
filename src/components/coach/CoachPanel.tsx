"use client";

import { useState } from "react";
import { SebastianAvatar } from "@/components/SebastianAvatar";
import { useCopy } from "@/content/i18n";
import type { CoachMemory } from "@/types/coach";

interface CoachPanelProps {
  memory: CoachMemory;
  reminded: boolean;
  onRemind(): void;
  onForget(): void;
}

/** Who Sebastian is and what he remembers. A sidebar on desktop, a collapsible header on phones. */
export function CoachPanel({ memory, reminded, onRemind, onForget }: CoachPanelProps) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const { child, plan, struggle } = memory;
  const knowsNothing = !child && memory.rehearsals === 0;

  return (
    <aside className="coach-panel card" aria-labelledby="coach-name">
      <div className="coach-panel-head">
        <SebastianAvatar size={56} />
        <div className="min-w-0 flex-1">
          <h1 id="coach-name" className="text-[22px]">{copy.coach.name}</h1>
          <p className="text-sm text-muted">
            {copy.coach.role}
            {child && <span className="block">{copy.coach.knows(child.name, child.ageYears)}</span>}
          </p>
        </div>
        <button type="button" className="btn btn-ghost min-[900px]:hidden" aria-expanded={open} aria-controls="coach-memory" onClick={() => setOpen((v) => !v)}>
          {copy.coach.memoryToggle}
        </button>
      </div>

      <div id="coach-memory" className={`grid gap-4 ${open ? "" : "max-[899px]:hidden"}`}>
        <h2 className="eyebrow">{copy.coach.memoryTitle}</h2>
        {knowsNothing ? (
          <p className="text-[15px] text-muted">{copy.coach.memoryEmpty}</p>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="stat-box flex-1"><span className="k">{copy.coach.memoryRehearsals}</span><span className="v">{memory.rehearsals}</span></div>
              <div className="stat-box flex-1"><span className="k">{copy.coach.memoryCalm}</span><span className="v">{memory.calmReached}</span></div>
            </div>
            <dl className="memory-list">
              {child && (
                <div><dt>{copy.coach.memoryChild}</dt><dd>{copy.coach.memoryChildValue(child.name, child.ageYears, copy.setup.temperaments[child.temperament])}</dd></div>
              )}
              {plan && <div><dt>{copy.coach.memoryPlan}</dt><dd>“{plan.phrase}”</dd></div>}
              {struggle && <div><dt>{copy.coach.memoryWorkingOn}</dt><dd>{copy.coach.workingOn[struggle]}</dd></div>}
            </dl>
          </>
        )}
        <p className="memory-privacy">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          {copy.coach.memoryPrivacy}
        </p>
        <div className="grid gap-2">
          <button type="button" className="btn btn-secondary" onClick={onRemind}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
            {copy.coach.reminder}
          </button>
          {reminded && <p className="text-sm font-semibold text-good-text" role="status">{copy.coach.reminderDone}</p>}
          <button type="button" className="btn btn-ghost text-bad-text" onClick={onForget}>{copy.coach.forget}</button>
        </div>
      </div>
    </aside>
  );
}
