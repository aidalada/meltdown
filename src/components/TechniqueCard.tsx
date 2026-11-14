import { copy } from "@/content/copy";
import { TECHNIQUE_BY_TAG } from "@/lib/data";
import type { TechniqueTag } from "@/lib/types";
import { signed } from "./TagChip";

/** why and source always come from techniques.json, never from the model (SPEC 9.9). */
export function TechniqueCard({ tag, variant, total }: { tag: TechniqueTag; variant: "worked" | "try"; total?: number }) {
  const t = TECHNIQUE_BY_TAG[tag];
  return (
    <div className="soft-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px]">{t.label}</h3>
        {variant === "worked" && total !== undefined && <span className="tag-chip tag-chip-pos">{signed(total)}</span>}
      </div>
      <p className="text-[15px] text-muted">{t.why}</p>
      <a className="text-[13px]" href={t.source.url} target="_blank" rel="noopener noreferrer">
        {copy.debrief.source}: {t.source.name}
      </a>
    </div>
  );
}
