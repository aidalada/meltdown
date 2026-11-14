"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import { copy } from "@/content/copy";
import { useHydrated } from "@/hooks/useHydrated";
import { PRESETS, TECHNIQUE_BY_TAG } from "@/lib/data";
import { loadPlan } from "@/lib/storage";

export default function SosPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Sos />;
}

function Sos() {
  const router = useRouter();
  const [phrases] = useState(() => loadPlan()?.phrases ?? PRESETS.find((p) => p.id === "teeth-bedtime")?.planPhrases ?? []);

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <div className="wrap wrap-narrow grid justify-items-center gap-8 py-10 text-center">
      <h1 className="text-[clamp(32px,6vw,52px)]">{copy.sos.title}</h1>
      <div className="breath" aria-hidden="true">
        <div className="breath-circle" />
        <span className="breath-label breath-in">{copy.sos.breatheIn}</span>
        <span className="breath-label breath-out">{copy.sos.breatheOut}</span>
      </div>
      <section className="grid w-full max-w-[560px] gap-2.5">
        <h2 className="eyebrow">{copy.sos.phrasesTitle}</h2>
        {phrases.map((p) => (
          <div key={p.phrase} className="card grid gap-1 px-5 py-4 text-left">
            <span className="font-display text-xl leading-snug font-extrabold">“{p.phrase}”</span>
            <span className="text-[13px] text-muted">{TECHNIQUE_BY_TAG[p.technique].label}</span>
          </div>
        ))}
      </section>
      <button type="button" className="btn btn-secondary btn-lg" onClick={back}>{copy.sos.back}</button>
    </div>
  );
}
