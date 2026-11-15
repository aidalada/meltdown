"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChildBadge } from "@/components/ChildBadge";
import { Icon } from "@/components/Icon";
import { WavesArt } from "@/components/ScenarioArt";
import { SebastianAvatar } from "@/components/SebastianAvatar";
import { PageSkeleton } from "@/components/Skeleton";
import { useTexts } from "@/content/i18n";
import { nextSosPick, SOS_STATES, sosText, type SosPick, type SosState } from "@/content/sos-coach";
import { useBreathSound } from "@/hooks/useBreathSound";
import { useHydrated } from "@/hooks/useHydrated";
import { choiceOf, rangeOf } from "@/lib/age";
import { DEFAULT_PROFILE, loadChildFacts, loadPlan, loadProfile } from "@/lib/storage";

export default function SosPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Sos />;
}

/** How long Sebastian "types" before the line appears, so it reads as an answer. */
const TYPING_MS = 650;

/**
 * SOS for the parent, in the middle of a meltdown. Two big buttons say how the parent feels right now;
 * Sebastian answers with a short, calming line (a new one each time) and invites them to talk it
 * through in the chat later. The waves sound helps them breathe.
 */
function Sos() {
  const { copy, locale } = useTexts();
  const router = useRouter();
  const [profile] = useState(() => loadProfile() ?? DEFAULT_PROFILE);
  const [rehearsed] = useState(() => loadPlan()?.phrases ?? []);
  const [facts] = useState(loadChildFacts);
  const [state, setState] = useState<SosState | null>(null);
  const [pick, setPick] = useState<SosPick | null>(null);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answer = useRef<HTMLDivElement>(null);
  const sound = useBreathSound();
  const age = copy.setup.ageRange(rangeOf(choiceOf(profile.ageYears)));

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function ask(next: SosState) {
    setPick(nextSosPick(next, state === next ? pick : null));
    setState(next);
    setTyping(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setTyping(false);
      answer.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, TYPING_MS);
  }

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  const reply = state && pick ? sosText(locale, state, pick) : null;

  return (
    <div className="wrap wrap-narrow grid grid-cols-[minmax(0,1fr)] gap-6 py-6">
      <header className="grid gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
          <ChildBadge years={profile.ageYears} size={32} girl={facts.gender === "girl"} />
          {copy.sos.forChild(facts.named ? profile.childName : copy.coach.yourChildTitle, age, copy.setup.temperaments[profile.temperament])}
          <Link href="/practice" className="font-semibold">{copy.sos.change}</Link>
        </p>
        <h1 className="text-[clamp(30px,7vw,48px)]">{copy.sos.heading}</h1>
      </header>

      <section className="grid gap-4" aria-labelledby="sos-question">
        <h2 id="sos-question" className="text-center text-[20px]">{copy.sos.stateQuestion}</h2>
        <div className="sos-states">
          {SOS_STATES.map((s) => (
            <button key={s} type="button" className={`sos-round sos-round-${s}`} aria-pressed={state === s} onClick={() => ask(s)}>
              <Icon name={s === "panic" ? "sos" : "flame"} size={40} />
              <span>{copy.sos.states[s]}</span>
            </button>
          ))}
        </div>
      </section>

      {state && (
        <div ref={answer} className="sos-answer" aria-live="polite">
          <SebastianAvatar size={56} decorative />
          {typing ? (
            <div className="bubble bubble-coach typing" role="status" aria-label={copy.coach.typing}><i /><i /><i /></div>
          ) : reply && (
            <div className="sos-answer-card">
              <p className="sos-answer-line">{reply.line}</p>
              <p className="sos-answer-ending">{reply.ending}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => ask(state)}>
                  <Icon name="repeat" size={18} />{copy.sos.another}
                </button>
                <Link className="btn btn-primary btn-wrap" href="/coach">{copy.coach.cta}</Link>
              </div>
            </div>
          )}
        </div>
      )}

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
        <Link className="btn btn-ghost btn-lg btn-wrap pl-2" href="/coach">
          <SebastianAvatar size={32} decorative />
          {copy.coach.sosLink}
        </Link>
      </div>
    </div>
  );
}
