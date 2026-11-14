"use client";

import { useCopy } from "@/content/i18n";
import { yearsForGroup } from "@/lib/age";
import { ageGroupOf } from "@/lib/data";
import type { Temperament } from "@/lib/types";
import { AgePicker } from "./AgePicker";

export interface ChildValues { childName: string; ageYears: number; temperament: Temperament }

const TEMPERAMENTS: Temperament[] = ["strong-willed", "sensitive", "easygoing"];

/**
 * The practice child: an age range and a temperament, both one tap. Nothing to type: the practice
 * name is assigned for the parent, and Sebastian remembers the answers.
 */
export function ChildFields({ value, onChange }: { value: ChildValues; onChange(next: ChildValues): void }) {
  const copy = useCopy();
  return (
    <div className="card grid grid-cols-[minmax(0,1fr)] gap-4 p-4">
      <p className="eyebrow">{copy.setup.childTitle}</p>
      <div className="grid gap-2">
        <span className="field-label" id="child-age">{copy.setup.ageLabel}</span>
        <AgePicker
          variant="cards" labelledBy="child-age" value={ageGroupOf(value.ageYears)}
          onPick={(group) => onChange({ ...value, ageYears: yearsForGroup(group, value.ageYears) })}
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <span className="field-label" id="child-temp">{copy.setup.temperamentLabel}</span>
        <div className="seg" role="group" aria-labelledby="child-temp">
          {TEMPERAMENTS.map((t) => (
            <button key={t} type="button" aria-pressed={value.temperament === t} onClick={() => onChange({ ...value, temperament: t })}>
              {copy.setup.temperaments[t]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[13px] text-muted">{copy.setup.practiceName(value.childName)}</p>
    </div>
  );
}
