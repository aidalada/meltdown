"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChildBadge } from "@/components/ChildBadge";
import { WavesArt } from "@/components/ScenarioArt";
import { Icon } from "@/components/Icon";
import { SebastianAvatar } from "@/components/SebastianAvatar";
import { PageSkeleton } from "@/components/Skeleton";
import { useTexts } from "@/content/i18n";
import { sosPhrases } from "@/content/sos-phrases";
import { useBreathSound } from "@/hooks/useBreathSound";
import { useHydrated } from "@/hooks/useHydrated";
import { choiceOf, rangeOf } from "@/lib/age";
import { DEFAULT_PROFILE, loadChildFacts, loadPlan, loadProfile } from "@/lib/storage";

export default function SosPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Sos />;
}

/**
 * Smart SOS: a cheat sheet for the middle of a meltdown. Three large phrases to say right now,
 * chosen for the child's age and temperament from the browser profile. No reading, no choices.
 */
function Sos() {
  const { copy, locale, technique } = useTexts();
  const router = useRouter();
  const [profile] = useState(() => loadProfile() ?? DEFAULT_PROFILE);
  const [rehearsed] = useState(() => loadPlan()?.phrases ?? []);
  const [facts] = useState(loadChildFacts);
  const sound = useBreathSound();
  const phrases = sosPhrases(profile.ageYears, profile.temperament);
  const age = copy.setup.ageRange(rangeOf(choiceOf(profile.ageYears)));

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <div className="wrap wrap-narrow grid grid-cols-[minmax(0,1fr)] gap-6 py-6">
      <header className="grid gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
          <ChildBadge years={profile.ageYears} size={32} girl={facts.gender === "girl"} />
          {copy.sos.forChild(facts.named ? profile.childName : copy.coach.yourChildTitle, age, copy.setup.temperaments[profile.temperament])}
          <Link href="/practice" className="font-semibold">{copy.sos.change}</Link>
        </p>
        <h1 className="text-[clamp(30px,7vw,48px)]">{copy.sos.sayNow}</h1>
      </header>

      <div className="sos-coach">
        <SebastianAvatar size={48} decorative />
        <div className="bubble bubble-coach">
          {copy.sos.calmLines.map((line) => <p key={line}>{line}</p>)}
        </div>
      </div>

      <button type="button" className="waves-btn" aria-pressed={sound.on} onClick={sound.toggle}>
        <WavesArt playing={sound.on} className="waves-art" />
        <span className="waves-body">
          <span className="waves-icon" aria-hidden="true"><Icon name={sound.on ? "soundOff" : "sound"} size={26} /></span>
          <span className="grid min-w-0 gap-0.5 text-left">
            <strong>{sound.on ? copy.sos.soundStop : copy.sos.sound}</strong>
            <small>{copy.sos.soundSub}</small>
          </span>
        </span>
      </button>

      <ol className="sos-list">
        {phrases.map((p, i) => (
          <li key={p.phrase} className="sos-card">
            <span className="sos-step" aria-hidden="true">{i + 1}</span>
            <div className="grid min-w-0 gap-1.5">
              <p className="sos-phrase" lang="en">{p.phrase}</p>
              {locale === "ru" && <p className="sos-note text-[15px]">{p.ru}</p>}
              <p className="sos-note text-[13px] font-semibold">{technique(p.technique).label}</p>
            </div>
          </li>
        ))}
      </ol>

      {rehearsed.length > 0 && (
        <section className="grid gap-2" aria-labelledby="sos-rehearsed">
          <h2 id="sos-rehearsed" className="eyebrow">{copy.sos.rehearsedTitle}</h2>
          <ul className="m-0 grid list-none gap-2 p-0">
            {rehearsed.map((p) => (
              <li key={p.phrase} className="card px-4 py-3">
                <span className="font-display text-[17px] leading-snug font-extrabold" lang="en">“{p.phrase}”</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" className="btn btn-secondary btn-lg" onClick={back}>{copy.sos.back}</button>
        <Link className="btn btn-ghost btn-lg btn-wrap pl-2" href="/">
          <SebastianAvatar size={32} decorative />
          {copy.coach.sosLink}
        </Link>
      </div>
    </div>
  );
}
