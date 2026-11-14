"use client";

import { useCopy } from "@/content/i18n";
import { CHILD_NAMES } from "@/lib/data";
import type { Temperament } from "@/lib/types";

export interface ChildValues { childName: string; ageYears: number; temperament: Temperament }

const AGES = Array.from({ length: 11 }, (_, i) => i + 2);
const TEMPERAMENTS: Temperament[] = ["strong-willed", "sensitive", "easygoing"];

/** Practice name, age and temperament, shared by both setup tabs (SPEC 14.2). */
export function ChildFields({ value, onChange }: { value: ChildValues; onChange(field: keyof ChildValues, next: ChildValues): void }) {
  const copy = useCopy();
  return (
    <div className="card grid gap-3.5 p-4">
      <p className="eyebrow">{copy.setup.childTitle}</p>
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-[140px_1fr_160px] md:items-end">
        <div className="grid min-w-0 gap-1.5">
          <label className="field-label" htmlFor="child-age">{copy.setup.ageLabel}</label>
          <select id="child-age" className="select" value={value.ageYears}
            onChange={(e) => onChange("ageYears", { ...value, ageYears: Number(e.target.value) })}>
            {AGES.map((n) => <option key={n} value={n}>{copy.setup.ageOption(n)}</option>)}
          </select>
        </div>
        <div className="order-3 col-span-2 grid min-w-0 gap-1.5 md:order-none md:col-span-1">
          <span className="field-label" id="child-temp">{copy.setup.temperamentLabel}</span>
          <div className="seg" role="group" aria-labelledby="child-temp">
            {TEMPERAMENTS.map((t) => (
              <button key={t} type="button" aria-pressed={value.temperament === t}
                onClick={() => onChange("temperament", { ...value, temperament: t })}>
                {copy.setup.temperaments[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid min-w-0 gap-1.5">
          <label className="field-label" htmlFor="child-name">{copy.setup.nameLabel}</label>
          <select id="child-name" className="select" value={value.childName}
            onChange={(e) => onChange("childName", { ...value, childName: e.target.value })}>
            {CHILD_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <p className="text-[13px] text-muted">{copy.setup.nameHint}</p>
    </div>
  );
}
