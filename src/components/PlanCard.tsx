"use client";

import { useRef, useState } from "react";
import { useTexts } from "@/content/i18n";
import type { PlanPhrase } from "@/lib/types";

export function PlanCard({ phrases, onCopy, onSave }: { phrases: PlanPhrase[]; onCopy(): void; onSave(): void }) {
  const { copy, technique } = useTexts();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const list = useRef<HTMLOListElement>(null);

  function selectList() {
    const el = list.current;
    const selection = window.getSelection();
    if (!el || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function copyPlan() {
    const text = phrases.map((p) => `• ${p.phrase}`).join("\n");
    try {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        onCopy();
        setTimeout(() => setCopied(false), 1500);
      }, selectList);
    } catch {
      selectList();
    }
  }

  return (
    <section className="card plan db-section">
      <h2 className="text-[22px] text-white">{copy.debrief.plan}</h2>
      <ol ref={list} className="m-0 grid list-none gap-2.5 p-0">
        {phrases.map((p) => (
          <li key={p.phrase} className="plan-item">
            <span className="plan-phrase">“{p.phrase}”</span>
            <span className="text-[13px] text-[#B9C2E0]">{technique(p.technique).label}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-secondary" type="button" onClick={copyPlan}>{copied ? copy.debrief.copied : copy.debrief.copy}</button>
        <button className="btn btn-ghost" type="button" onClick={() => { onSave(); setSaved(true); }}>{saved ? copy.debrief.saved : copy.debrief.save}</button>
      </div>
    </section>
  );
}
