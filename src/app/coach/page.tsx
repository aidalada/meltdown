"use client";

import { useState } from "react";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { CoachThread } from "@/components/coach/CoachThread";
import { ForgetDialog } from "@/components/coach/ForgetDialog";
import { SafetyNotice } from "@/components/SafetyNotice";
import { PageSkeleton } from "@/components/Skeleton";
import { TurnInput } from "@/components/TurnInput";
import { copy } from "@/content/copy";
import { useCoach } from "@/hooks/useCoach";
import { useHydrated } from "@/hooks/useHydrated";

export default function CoachPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Coach />;
}

function Coach() {
  const coach = useCoach();
  const [confirmForget, setConfirmForget] = useState(false);
  const started = coach.messages.some((m) => m.role === "parent");

  return (
    <div className="wrap coach-layout">
      <CoachPanel memory={coach.memory} reminded={coach.reminded} onRemind={coach.remind} onForget={() => setConfirmForget(true)} />

      <section className="coach-main" aria-label={copy.coach.threadLabel}>
        <CoachThread
          messages={coach.messages}
          typing={coach.typing}
          today={coach.today}
          pendingCheckin={coach.pendingCheckin}
          rehearsing={coach.rehearsing}
          onCheckin={coach.checkin}
          onRehearse={(text) => void coach.rehearse(text)}
        />
        {!started && !coach.typing && (
          <div className="grid gap-2 pb-2">
            <p className="eyebrow">{copy.coach.startersLabel}</p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {copy.coach.starters.map((line) => (
                <li key={line}>
                  <button type="button" className="starter" onClick={() => void coach.send(line)}>{line}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex-1" aria-hidden="true" />
        <TurnInput
          disabled={coach.typing || coach.rehearsing}
          onSend={coach.send}
          label={copy.coach.inputLabel}
          placeholder={copy.coach.inputPlaceholder}
        />
        <p className="pb-2 text-center text-[13px] text-muted">{copy.coach.footnote}</p>
      </section>

      {coach.safety && <SafetyNotice kind={coach.safety} onContinue={coach.closeSafety} />}
      {confirmForget && (
        <ForgetDialog
          onConfirm={() => { coach.forget(); setConfirmForget(false); }}
          onCancel={() => setConfirmForget(false)}
        />
      )}
    </div>
  );
}
