"use client";

import Link from "next/link";
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

/**
 * The home screen: a chat with Sebastian, the AI coach who remembers the family and turns advice
 * into a rehearsal ("Rehearse this" on his reply opens /practice/[id]).
 * Reads localStorage, so it renders a skeleton until hydrated (CLAUDE.md rule 12).
 */
export function CoachChat() {
  const hydrated = useHydrated();
  const locale = useLocale();
  if (!hydrated) return <PageSkeleton />;
  // A new language rebuilds Sebastian's greeting in that language.
  return <Chat key={locale} />;
}

function Chat() {
  const copy = useCopy();
  const coach = useCoach();
  const [confirmForget, setConfirmForget] = useState(false);
  // Starters are the next step after the age question, and go away once Sebastian has given advice.
  const advised = coach.messages.some((m) => m.role === "coach" && m.technique !== undefined);
  const showStarters = !advised && !coach.pendingAge && !coach.typing;
  // A first-time visitor gets one line on what this is; it leaves once they start talking.
  const firstVisit = !coach.messages.some((m) => m.role === "parent");

  return (
    <div className="wrap coach-layout">
      <CoachPanel memory={coach.memory} reminded={coach.reminded} onRemind={coach.remind} onForget={() => setConfirmForget(true)} />

      <section className="coach-main" aria-label={copy.coach.threadLabel}>
        {firstVisit && (
          <div className="coach-intro">
            <h2 className="text-[clamp(22px,3.6vw,30px)]">{copy.landing.title}</h2>
            <p className="text-muted">
              {copy.landing.subtitle}{" "}
              <Link href="/about" className="font-semibold whitespace-nowrap">{copy.nav.about}</Link>
            </p>
          </div>
        )}
        <CoachThread
          messages={coach.messages}
          typing={coach.typing}
          today={coach.today}
          pendingCheckin={coach.pendingCheckin}
          pendingAge={coach.pendingAge}
          rehearsing={coach.rehearsing}
          childYears={coach.memory.child?.ageYears}
          girl={coach.memory.child?.gender === "girl"}
          onPickAge={coach.pickAge}
          onCheckin={coach.checkin}
          onRehearse={(text, preset) => void coach.rehearse(text, preset)}
        />
        {showStarters && (
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
