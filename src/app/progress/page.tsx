"use client";

import Link from "next/link";
import { useState } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import { copy } from "@/content/copy";
import { useHydrated } from "@/hooks/useHydrated";
import { track } from "@/lib/analytics";
import { localDate, streakDays } from "@/lib/progress";
import { addCheckin, listSessions, loadCheckins, loadPlan, type Checkin } from "@/lib/storage";
import type { Session } from "@/lib/types";

export default function ProgressPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Progress />;
}

type Result = Checkin["result"];
const RESULTS: Result[] = ["worked", "partly", "didnt"];

function CheckinCard() {
  const [plan] = useState(() => loadPlan());
  const [answered, setAnswered] = useState<Result | null>(() =>
    plan ? loadCheckins().find((c) => c.sessionId === plan.sessionId)?.result ?? null : null,
  );
  if (!plan) return null;

  function answer(result: Result) {
    if (!plan) return;
    addCheckin({ date: localDate(new Date()), sessionId: plan.sessionId, result });
    track("checkin", { result });
    setAnswered(result);
  }

  return (
    <section className="card db-section">
      <h2 className="text-[22px]">{copy.progress.checkinTitle}</h2>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {plan.phrases.map((p) => <li key={p.phrase} className="font-display text-[17px] font-extrabold">“{p.phrase}”</li>)}
      </ul>
      {answered ? (
        <p className="font-semibold text-good-text" role="status">{copy.progress.checkinThanks}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {RESULTS.map((r) => (
            <button key={r} type="button" className="btn btn-secondary" onClick={() => answer(r)}>{copy.progress[r]}</button>
          ))}
        </div>
      )}
      <div><Link className="btn btn-ghost" href="/sos">{copy.progress.sosLink}</Link></div>
    </section>
  );
}

function SessionRow({ s }: { s: Session }) {
  const ended = s.status === "ended";
  const end = s.turns.length ? s.turns[s.turns.length - 1].moodAfter : s.startMood;
  const date = new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <li className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{s.scenario.title}</p>
        <p className="text-sm text-muted">
          {date} · {s.scenario.childName} · {s.startMood} → {end}
          {s.difficulty === "hard" ? ` · ${copy.rehearsal.hard}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {ended && s.outcome !== "continue" && (
          <span className={`pill ${s.outcome === "calm_reached" ? "pill-good" : ""}`}>{copy.debrief.outcomes[s.outcome]}</span>
        )}
        <Link className="btn btn-secondary min-h-10" href={ended ? `/practice/${s.id}/debrief` : `/practice/${s.id}`}>
          {ended ? copy.progress.open : copy.progress.resume}
        </Link>
      </div>
    </li>
  );
}

function Progress() {
  const [sessions] = useState(() => listSessions().filter((s) => s.turns.length > 0));
  const [streak] = useState(() => streakDays(sessions, new Date()));

  return (
    <div className="wrap wrap-narrow">
      <div className="flex flex-wrap items-center gap-3 pt-7 pb-5">
        <h1 className="text-[clamp(28px,4.6vw,40px)]">{copy.progress.title}</h1>
        {streak > 0 && <span className="pill pill-good">{copy.progress.streak(streak)}</span>}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <CheckinCard />
        <section className="grid gap-3">
          <h2 className="text-[22px]">{copy.progress.recentTitle}</h2>
          {sessions.length ? (
            <ul className="m-0 grid list-none gap-2.5 p-0">{sessions.map((s) => <SessionRow key={s.id} s={s} />)}</ul>
          ) : (
            <div className="card grid justify-items-start gap-3 p-5">
              <p className="text-muted">{copy.progress.empty}</p>
              <Link className="btn btn-primary" href="/practice">{copy.nav.start}</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
