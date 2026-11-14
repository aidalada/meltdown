import { TECHNIQUE_BY_TAG } from "@/lib/data";
import type { TechniqueTag } from "@/lib/types";

export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "0";
}

export function TagChip({ tag, applied }: { tag: TechniqueTag; applied: number }) {
  const technique = TECHNIQUE_BY_TAG[tag];
  const positive = technique.polarity === "positive";
  return (
    <span className={`tag-chip ${positive ? "tag-chip-pos" : "tag-chip-neg"}`}>
      <span className="dot" aria-hidden="true" />
      {technique.label} {signed(applied)}
    </span>
  );
}
