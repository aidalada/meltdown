"use client";

import { useTexts } from "@/content/i18n";
import { TECHNIQUE_BY_TAG } from "@/lib/data";
import type { Rewrite } from "@/lib/types";

export function RewriteCard({ rewrite }: { rewrite: Rewrite }) {
  const { copy, technique } = useTexts();
  const t = TECHNIQUE_BY_TAG[rewrite.technique];
  const text = technique(rewrite.technique);
  return (
    <div className="soft-card gap-2.5">
      <p className="text-[15px] text-muted">
        <span className="rw-label">{copy.debrief.instead}</span>
        <s className="decoration-bad decoration-2">{rewrite.original}</s>
      </p>
      <p className="text-[17px] font-semibold">
        <span className="rw-label text-good-text">{copy.debrief.try}</span>
        {rewrite.improved}
      </p>
      <div><span className="tag-chip tag-chip-pos">{text.label}</span></div>
      <p className="text-[15px] text-muted">{text.why}</p>
      <a className="text-[13px]" href={t.source.url} target="_blank" rel="noopener noreferrer">
        {copy.debrief.source}: {t.source.name}
      </a>
    </div>
  );
}
