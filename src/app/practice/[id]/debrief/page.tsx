"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackupBadge } from "@/components/BackupBadge";
import { Disclaimer } from "@/components/Disclaimer";
import { MoodChart, type ChartPoint } from "@/components/MoodChart";
import { PlanCard } from "@/components/PlanCard";
import { RewriteCard } from "@/components/RewriteCard";
import { PageSkeleton } from "@/components/Skeleton";
import { TechniqueCard } from "@/components/TechniqueCard";
import { copy } from "@/content/copy";
import { useHydrated } from "@/hooks/useHydrated";
import { createSession } from "@/hooks/useSession";
import { track } from "@/lib/analytics";
import { postDebrief, RateLimitedError } from "@/lib/api-client";
import { TECHNIQUE_BY_TAG } from "@/lib/data";
import { loadSession, savePlan, saveSession } from "@/lib/storage";
import type { Outcome, PositiveTag, Session } from "@/lib/types";

const inFlight = new Set<string>();

export default function DebriefPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Debrief key={id} id={id} />;
}

function workedTags(session: Session): [PositiveTag, number][] {
  const totals = new Map<PositiveTag, number>();
  for (const turn of session.turns) {
    for (const { tag, applied } of turn.tags) {
      const t = TECHNIQUE_BY_TAG[tag];
      if (t.polarity === "positive") totals.set(t.tag, (totals.get(t.tag) ?? 0) + applied);
    }
  }
  return [...totals].sort((a, b) => b[1] - a[1]);
}

function finalOutcome(s: Session): Exclude<Outcome, "continue"> {
  return s.outcome === "continue" ? "ended_by_parent" : s.outcome;
}

function Debrief({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(() => loadSession(id));
  const [source, setSource] = useState<"ai" | "fallback" | null>(() => loadSession(id)?.debrief?.source ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.debrief || session.turns.length === 0 || inFlight.has(session.id)) return;
    inFlight.add(session.id);
    const s = session;
    const outcome = finalOutcome(s);
    postDebrief({ scenario: s.scenario, turns: s.turns, outcome, startMood: s.startMood })
      .then(({ result, source: from }) => {
        const next: Session = { ...s, status: "ended", outcome, debrief: result };
        saveSession(next);
        setSession(next);
        setSource(from);
        track("debrief_viewed", { source: from });
      })
      .catch((e: unknown) => setError(e instanceof RateLimitedError ? copy.rehearsal.rateLimited : copy.rehearsal.notFound))
      .finally(() => inFlight.delete(s.id));
  }, [session]);

  if (!session || session.turns.length === 0) {
    return (
      <div className="wrap wrap-narrow grid gap-4 py-16 text-center">
        <h1 className="text-2xl">{copy.rehearsal.notFound}</h1>
        <div><Link className="btn btn-primary" href="/practice">{copy.rehearsal.backToSetup}</Link></div>
      </div>
    );
  }

  const s = session;
  const d = s.debrief;
  const worked = workedTags(s);
  const points: ChartPoint[] = [
    { turn: 0, mood: s.startMood },
    ...s.turns.map((t) => ({ turn: t.index + 1, mood: t.moodAfter, delta: t.delta, text: t.parentText })),
  ];

  function practiceAgain(difficulty: Session["difficulty"]) {
    const next = createSession(s.scenario, difficulty);
    track("start_practice", { source: s.scenario.source, ageGroup: s.scenario.ageGroup, difficulty });
    router.push(`/practice/${next.id}`);
  }

  return (
    <div className="wrap wrap-narrow">
      <div className="grid gap-2 pt-7 pb-5">
        <p className="eyebrow">{s.scenario.title}</p>
        <h1 className="text-[clamp(28px,4.6vw,40px)]">{copy.debrief.howItWent}</h1>
      </div>

      {!d ? (
        <div className="card db-section" aria-busy="true">
          {error ? <p className="form-error" role="alert">{error}</p> : (
            <>
              <div className="skeleton" style={{ width: "70%" }} />
              <div className="skeleton" style={{ width: "45%" }} />
              <div className="skeleton" style={{ height: 160 }} />
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-2">
          <section className="card db-section">
            <p className="db-summary">{d.summary}</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="stat-box"><span className="k">{copy.debrief.statTurns}</span><span className="v">{d.stats.turns}</span></div>
              <div className="stat-box">
                <span className="k">{copy.debrief.statStart} → {copy.debrief.statEnd}</span>
                <span className="v">{d.stats.startMood} → {d.stats.endMood}</span>
              </div>
              <span className={`pill ${d.stats.outcome === "calm_reached" ? "pill-good" : ""}`}>
                {d.stats.outcome === "continue" ? "" : copy.debrief.outcomes[d.stats.outcome]}
              </span>
              <BackupBadge visible={source === "fallback"} />
            </div>
          </section>

          <section className="card db-section">
            <h2 className="text-[22px]">{copy.debrief.chartTitle}</h2>
            <MoodChart points={points} />
          </section>

          <section className="card db-section">
            <h2 className="text-[22px]">{copy.debrief.worked}</h2>
            {worked.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {worked.map(([tag, total]) => <TechniqueCard key={tag} tag={tag} variant="worked" total={total} />)}
              </div>
            ) : <p className="text-muted">{copy.debrief.workedEmpty}</p>}
          </section>

          {d.rewrites.length > 0 && (
            <section className="card db-section">
              <h2 className="text-[22px]">{copy.debrief.tryInstead}</h2>
              {d.rewrites.map((r) => <RewriteCard key={r.turnIndex} rewrite={r} />)}
            </section>
          )}

          <PlanCard
            phrases={d.tonightPlan}
            onCopy={() => track("plan_copied")}
            onSave={() => { savePlan(s.id, d.tonightPlan); track("plan_saved"); }}
          />

          <div className="flex flex-wrap gap-2.5">
            <button className="btn btn-primary btn-lg" type="button" onClick={() => practiceAgain(s.difficulty)}>{copy.debrief.again}</button>
            {s.difficulty === "normal" && (
              <button className="btn btn-secondary btn-lg" type="button" onClick={() => practiceAgain("hard")}>{copy.debrief.harder}</button>
            )}
            <Link className="btn btn-secondary btn-lg" href="/practice">{copy.debrief.newMoment}</Link>
          </div>
          <Disclaimer variant="short" />
        </div>
      )}
    </div>
  );
}
