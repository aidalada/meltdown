"use client";

import { useTexts } from "@/content/i18n";
import { PRESETS, PRESET_PRIORITY } from "@/lib/data";
import type { Scenario } from "@/lib/types";
import { Icon, scenarioIcon } from "./Icon";

const P0 = PRESETS.filter((p) => PRESET_PRIORITY[p.id] === "P0");

/** Preset cards (P0 only before milestone M3). `resolve` applies the parent's field overrides. */
export function ScenarioPicker({ onPick, resolve }: { onPick(s: Scenario): void; resolve(s: Scenario): Scenario }) {
  const { scenario } = useTexts();
  return (
    <div className="grid grid-cols-1 gap-3 pt-5 md:grid-cols-3">
      {P0.map((preset) => {
        const s = resolve(preset);
        return (
          <button key={preset.id} type="button" className="card preset" onClick={() => onPick(s)}>
            <div className="flex items-center gap-3">
              <span className="icon-tile" aria-hidden="true"><Icon name={scenarioIcon(preset.id)} size={28} /></span>
              <h3 className="text-lg">{scenario(preset).title}</h3>
            </div>
            <p className="text-sm text-muted">{scenario(preset).setting}</p>
            <p className="rounded-[10px] bg-bg px-2.5 py-2 text-sm">“{preset.openingLine}”</p>
          </button>
        );
      })}
    </div>
  );
}
