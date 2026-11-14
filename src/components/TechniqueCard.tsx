"use client";

import { useTexts } from "@/content/i18n";
import { TECHNIQUE_BY_TAG } from "@/lib/data";
import { signed } from "@/lib/format";
import type { TechniqueTag } from "@/lib/types";
import { Disclosure } from "./Disclosure";

/** why and source always come from techniques.json, never from the model (SPEC 9.9). The why opens on demand. */
export function TechniqueCard({ tag, variant, total }: { tag: TechniqueTag; variant: "worked" | "try"; total?: number }) {
  const { copy, technique } = useTexts();
  const { source } = TECHNIQUE_BY_TAG[tag];
  const text = technique(tag);
  return (
    <div className="soft-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px]">{text.label}</h3>
        {variant === "worked" && total !== undefined && <span className="tag-chip tag-chip-pos">{signed(total)}</span>}
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
