"use client";

import { useTexts } from "@/content/i18n";
import { PRESETS, PRESET_PRIORITY } from "@/lib/data";
import type { Scenario } from "@/lib/types";
import { ChildAvatar } from "./ChildAvatar";

const P0 = PRESETS.filter((p) => PRESET_PRIORITY[p.id] === "P0");

/** Preset cards (P0 only before milestone M3). `resolve` applies the parent's field overrides. */
export function ScenarioPicker({ onPick, resolve }: { onPick(s: Scenario): void; resolve(s: Scenario): Scenario }) {
  const { copy, scenario } = useTexts();
  return (
    <div className="grid grid-cols-1 gap-3 pt-5 md:grid-cols-3">
      {P0.map((preset) => {
        const s = resolve(preset);
        return (
          <button key={preset.id} type="button" className="card preset" onClick={() => onPick(s)}>
            <div className="flex items-center gap-3">
              <ChildAvatar band="upset" speaking={false} thinking={false} name={s.childName} size={56} showName={false} />
              <div>
                <h3 className="text-lg">{scenario(preset).title}</h3>
                <p className="text-[13px] font-semibold text-muted">
                  {s.childName} · {copy.setup.ageShort(s.ageYears)} · {copy.setup.temperaments[s.temperament]}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted">{scenario(preset).setting}</p>
            <p className="rounded-[10px] bg-bg px-2.5 py-2 text-sm">“{preset.openingLine}”</p>
          </button>
        );
      })}
    </div>
  );
}
