"use client";

import { useCopy } from "@/content/i18n";
import { AGE_OPTIONS, type AgeChoice } from "@/lib/age";
import { ChildBadge } from "./ChildBadge";

interface AgePickerProps {
  /** The selected range, or null when the parent has not chosen yet. */
  value: AgeChoice | null;
  onPick(choice: AgeChoice): void;
  /** "cards" for the setup screen, "chips" for Sebastian's question in the chat. */
  variant: "cards" | "chips";
  labelledBy?: string;
}

/** Ready-made age ranges. Each button shows the practice child at that age, so the choice is visible. */
export function AgePicker({ value, onPick, variant, labelledBy }: AgePickerProps) {
  const copy = useCopy();
  const cards = variant === "cards";
  return (
    <div className={cards ? "age-cards" : "flex flex-wrap gap-2"} role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : copy.setup.ageLabel}>
      {AGE_OPTIONS.map((option) => (
        <button
          key={option.id} type="button" className={cards ? "age-card" : "chip-btn age-chip"}
          aria-pressed={value === option.id} onClick={() => onPick(option.id)}
        >
          <ChildBadge years={option.years} size={cards ? 60 : 32} />
          <span className="age-text">
            <span className="age-range">{copy.setup.ageRange(option.range)}</span>
            {cards && <span className="text-[13px] font-medium text-muted">{copy.setup.ageGroups[option.id]}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
