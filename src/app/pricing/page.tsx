"use client";

import { useState, useSyncExternalStore } from "react";
import { TrackView } from "@/components/TrackView";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { trialDay } from "@/lib/storage";

const LINKS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_LINK_MONTHLY ?? "",
  yearly: process.env.NEXT_PUBLIC_STRIPE_LINK_YEARLY ?? "",
};
const subscribe = () => () => {};
const readTrialDay = () => Math.min(trialDay(), 30);
const readSuccess = () => new URLSearchParams(window.location.search).get("status") === "success";

type Plan = "monthly" | "yearly";

function BuyButton({ plan, primary, onWaitlist }: { plan: Plan; primary: boolean; onWaitlist(): void }) {
  const className = `btn btn-lg ${primary ? "btn-primary" : "btn-secondary"}`;
  const label = copy.pricing[plan].cta;
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

  return (
    <div className="wrap wrap-narrow">
      <TrackView event="pricing_view" />
      <div className="grid gap-2 pt-7 pb-5">
        <h1 className="text-[clamp(28px,4.6vw,40px)]">{copy.pricing.title}</h1>
        <p className="text-muted">{copy.pricing.trial}</p>
        {success && <p className="font-semibold text-good-text">{copy.pricing.success}</p>}
        {day > 0 && <p className="text-sm font-semibold text-good-text">{copy.pricing.trialDay(day)}</p>}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
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
