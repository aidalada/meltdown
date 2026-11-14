"use client";

import { useTexts } from "@/content/i18n";
import { TECHNIQUE_BY_TAG } from "@/lib/data";
import { signed } from "@/lib/format";
import type { TechniqueTag } from "@/lib/types";

export { signed };

export function TagChip({ tag, applied }: { tag: TechniqueTag; applied: number }) {
  const { technique: text } = useTexts();
  const positive = TECHNIQUE_BY_TAG[tag].polarity === "positive";
  return (
    <span className={`tag-chip ${positive ? "tag-chip-pos" : "tag-chip-neg"}`}>
      <span className="dot" aria-hidden="true" />
      {text(tag).label} {signed(applied)}
    </span>
  );
}
