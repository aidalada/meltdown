"use client";

import { useEffect, useRef } from "react";
import { copy } from "@/content/copy";

const NUMBERS = {
  child_at_risk: [
    { label: copy.safety.call911, number: "911", href: "tel:911" },
    { label: copy.safety.callChildhelp, number: "1-800-422-4453", href: "tel:18004224453" },
  ],
  parent_crisis: [{ label: copy.safety.call988, number: "988", href: "tel:988" }],
} as const;

export function SafetyNotice({ kind, onContinue }: { kind: "child_at_risk" | "parent_crisis"; onContinue(): void }) {
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    back.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onContinue(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContinue]);
  const child = kind === "child_at_risk";
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="safety-title">
      <div className="card grid w-full max-w-[460px] gap-3.5 p-6">
        <h2 id="safety-title" className="text-[22px]">{child ? copy.safety.childTitle : copy.safety.parentTitle}</h2>
        <p>{child ? copy.safety.childBody : copy.safety.parentBody}</p>
        <div className="grid gap-2">
          {NUMBERS[kind].map((n) => (
            <a key={n.href} className="phone-link" href={n.href}>
              {n.label}
              <span>{n.number}</span>
            </a>
          ))}
        </div>
        <button ref={back} className="btn btn-primary" type="button" onClick={onContinue}>{copy.safety.back}</button>
      </div>
    </div>
  );
}
