"use client";

import { useState, useSyncExternalStore } from "react";
import { TrackView } from "@/components/TrackView";
import { copy } from "@/content/copy";
import { useHydrated } from "@/hooks/useHydrated";
import { track } from "@/lib/analytics";
import { first30Stats } from "@/lib/progress";
import { listSessions, trialDay } from "@/lib/storage";

const LINKS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_MONTHLY ?? "",
  yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_YEARLY ?? "",
};
const subscribe = () => () => {};
/** `?day=30` shows the end of the trial for the demo (SPEC 14.5, P1). */
const readTrialDay = () => {
  const forced = Number(new URLSearchParams(window.location.search).get("day"));
  if (Number.isInteger(forced) && forced >= 1 && forced <= 30) return forced;
  return Math.min(trialDay(), 30);
};
const readSuccess = () => new URLSearchParams(window.location.search).get("status") === "success";

type Plan = "monthly" | "yearly";

function First30() {
  const [stats] = useState(() => first30Stats(listSessions()));
  if (stats.rehearsals === 0) return null;
  return (
    <section className="card db-section mt-4">
      <h2 className="text-[22px]">{copy.pricing.first30Title}</h2>
      <div className="flex flex-wrap gap-2">
        <div className="stat-box"><span className="k">{copy.pricing.first30Rehearsals}</span><span className="v">{stats.rehearsals}</span></div>
        <div className="stat-box"><span className="k">{copy.pricing.first30Calm}</span><span className="v">{stats.calmReached}</span></div>
      </div>
      {stats.bestPhrases.length > 0 && (
        <div className="grid gap-1.5">
          <p className="eyebrow">{copy.pricing.first30Phrases}</p>
          {stats.bestPhrases.map((p) => <p key={p} className="font-display text-[17px] font-extrabold">“{p}”</p>)}
        </div>
      )}
    </section>
  );
}

function BuyButton({ plan, primary, onWaitlist }: { plan: Plan; primary: boolean; onWaitlist(): void }) {
  const className = `btn btn-lg ${primary ? "btn-primary" : "btn-secondary"}`;
  // Without a Stripe link the button only joins the waitlist, so it must say so (SPEC 14.5).
  const label = LINKS[plan] ? copy.pricing[plan].cta : copy.pricing.waitlistCta;
  if (LINKS[plan]) {
    return (
      <a className={className} href={LINKS[plan]} target="_blank" rel="noopener noreferrer" onClick={() => track("buy_click", { plan })}>
        {label}
      </a>
    );
  }
  return (
    <button className={className} type="button" onClick={() => { track("buy_click", { plan }); onWaitlist(); }}>
      {label}
    </button>
  );
}

export default function PricingPage() {
  const day = useSyncExternalStore(subscribe, readTrialDay, () => 0);
  const success = useSyncExternalStore(subscribe, readSuccess, () => false);
  const [thanks, setThanks] = useState(false);
  const hydrated = useHydrated();

  return (
    <div className="wrap wrap-narrow">
      <TrackView event="pricing_view" />
      <div className="grid gap-2 pt-7 pb-5">
        <h1 className="text-[clamp(28px,4.6vw,40px)]">{copy.pricing.title}</h1>
        <p className="text-muted">{copy.pricing.trial}</p>
        {success && <p className="font-semibold text-good-text">{copy.pricing.success}</p>}
        {day > 0 && <p className="text-sm font-semibold text-good-text">{copy.pricing.trialDay(day)}</p>}
      </div>
      {hydrated && <First30 />}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card grid content-start gap-3.5 p-6">
          <h2 className="text-xl">{copy.pricing.monthly.name}</h2>
          <p className="price-amount">{copy.pricing.monthly.price}<span className="price-per">{copy.pricing.monthly.per}</span></p>
          <BuyButton plan="monthly" primary={false} onWaitlist={() => setThanks(true)} />
        </div>
        <div className="card grid content-start gap-3.5 border-2 border-primary p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl">{copy.pricing.yearly.name}</h2>
            <span className="pill pill-primary">{copy.pricing.yearly.badge}</span>
          </div>
          <p className="price-amount">{copy.pricing.yearly.price}<span className="price-per">{copy.pricing.yearly.per}</span></p>
          <BuyButton plan="yearly" primary onWaitlist={() => setThanks(true)} />
        </div>
      </div>
      {thanks && <p className="mt-3 text-sm font-semibold text-good-text" role="status">{copy.pricing.waitlistThanks}</p>}
      <div className="card mt-4 grid gap-3 p-5">
        <h2 className="text-lg">{copy.pricing.includesTitle}</h2>
        <ul className="m-0 grid list-none gap-2 p-0">
          {copy.pricing.includes.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <svg className="mt-[3px] flex-none text-good" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5 9-10" />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="test-note mt-4">{copy.pricing.testNote}</p>
    </div>
  );
}
