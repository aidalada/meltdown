"use client";

import { useState } from "react";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { CoachThread } from "@/components/coach/CoachThread";
import { ForgetDialog } from "@/components/coach/ForgetDialog";
import { Icon, type IconName } from "@/components/Icon";
import { SafetyNotice } from "@/components/SafetyNotice";
import { PageSkeleton } from "@/components/Skeleton";
import { TurnInput } from "@/components/TurnInput";
import { useCopy, useLocale } from "@/content/i18n";
import { useCoach } from "@/hooks/useCoach";
import { useHydrated } from "@/hooks/useHydrated";

/** The three starters are bedtime, the playground and getting dressed, in both languages. */
const STARTER_ICONS: IconName[] = ["toothbrush", "slide", "shirt"];

export default function CoachPage() {
  const hydrated = useHydrated();
  const locale = useLocale();
  if (!hydrated) return <PageSkeleton />;
  // A new language rebuilds Sebastian's greeting in that language.
  return <Coach key={locale} />;
}

function Coach() {
  const copy = useCopy();
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
          onRehearse={(text, preset) => void coach.rehearse(text, preset)}
        />
        {!started && !coach.typing && (
          <div className="grid gap-2 pb-2">
            <p className="eyebrow">{copy.coach.startersLabel}</p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {copy.coach.starters.map((line, i) => (
                <li key={line}>
                  <button type="button" className="starter" onClick={() => void coach.send(line)}>
                    <span className="icon-tile icon-tile-sm" aria-hidden="true"><Icon name={STARTER_ICONS[i] ?? "heart"} size={20} /></span>
                    <span>{line}</span>
                  </button>
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
