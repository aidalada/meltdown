"use client";

import { useEffect, useRef } from "react";
import { copy } from "@/content/copy";

/** Confirms "Forget everything". Focus starts on the safe choice; Esc cancels. */
export function ForgetDialog({ onConfirm, onCancel }: { onConfirm(): void; onCancel(): void }) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keep.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="forget-title" aria-describedby="forget-body">
      <div className="card grid w-full max-w-[440px] gap-3.5 p-6">
        <h2 id="forget-title" className="text-[22px]">{copy.coach.forgetTitle}</h2>
        <p id="forget-body">{copy.coach.forgetBody}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button ref={keep} type="button" className="btn btn-secondary" onClick={onCancel}>{copy.coach.forgetCancel}</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>{copy.coach.forgetConfirm}</button>
        </div>
      </div>
    </div>
  );
}
