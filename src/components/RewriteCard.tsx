"use client";

import { useTexts } from "@/content/i18n";
import { TECHNIQUE_BY_TAG } from "@/lib/data";
import type { Rewrite } from "@/lib/types";
import { Disclosure } from "./Disclosure";

/** "Instead of / Try" stays visible; the reason and its source open on demand. */
export function RewriteCard({ rewrite }: { rewrite: Rewrite }) {
  const { copy, technique } = useTexts();
  const { source } = TECHNIQUE_BY_TAG[rewrite.technique];
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="tag-chip tag-chip-pos">{text.label}</span>
      </div>
      <Disclosure>
        <Disclosure.Button>{copy.debrief.why}</Disclosure.Button>
        <Disclosure.Panel>
          <p className="text-[15px] text-muted">{text.why}</p>
          <a className="text-[13px]" href={source.url} target="_blank" rel="noopener noreferrer">{copy.debrief.source}: {source.name}</a>
        </Disclosure.Panel>
      </Disclosure>
    </div>
  );
}
