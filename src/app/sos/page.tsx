"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { SebastianAvatar } from "@/components/SebastianAvatar";
import { PageSkeleton } from "@/components/Skeleton";
import { useTexts } from "@/content/i18n";
import { useBreathSound } from "@/hooks/useBreathSound";
import { useHydrated } from "@/hooks/useHydrated";
import { PRESETS } from "@/lib/data";
import { loadPlan } from "@/lib/storage";

export default function SosPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Sos />;
}

function Sos() {
  const { copy, technique } = useTexts();
  const router = useRouter();
  const [phrases] = useState(() => loadPlan()?.phrases ?? PRESETS.find((p) => p.id === "teeth-bedtime")?.planPhrases ?? []);
  const sound = useBreathSound();
  // Restarting the circle when the sound starts keeps the tone and the animation on the same breath.
  const [cycle, setCycle] = useState(0);

  function toggleSound() {
    if (!sound.on) setCycle((c) => c + 1);
    sound.toggle();
  }

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <div className="wrap wrap-narrow grid grid-cols-[minmax(0,1fr)] justify-items-center gap-8 py-10 text-center">
      <h1 className="text-[clamp(32px,6vw,52px)]">{copy.sos.title}</h1>
      <div key={cycle} className="breath" aria-hidden="true">
        <div className="breath-circle" />
        <span className="breath-label breath-in">{copy.sos.breatheIn}</span>
        <span className="breath-label breath-out">{copy.sos.breatheOut}</span>
      </div>
      <button type="button" className="chip-btn inline-flex items-center gap-2" aria-pressed={sound.on} onClick={toggleSound}>
        <Icon name={sound.on ? "sound" : "soundOff"} size={18} />
        {copy.sos.sound}
      </button>
      <section className="grid w-full max-w-[560px] gap-2.5">
        <h2 className="eyebrow">{copy.sos.phrasesTitle}</h2>
        {phrases.map((p) => (
          <div key={p.phrase} className="card grid gap-1 px-5 py-4 text-left">
            <span className="font-display text-xl leading-snug font-extrabold">“{p.phrase}”</span>
            <span className="text-[13px] text-muted">{technique(p.technique).label}</span>
          </div>
        ))}
      </section>
      <div className="flex flex-wrap justify-center gap-2.5">
        <button type="button" className="btn btn-secondary btn-lg" onClick={back}>{copy.sos.back}</button>
        <Link className="btn btn-ghost btn-lg btn-wrap pl-2" href="/coach">
          <SebastianAvatar size={32} decorative />
          {copy.coach.sosLink}
        </Link>
      </div>
    </div>
  );
}
