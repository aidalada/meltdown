"use client";

import { useTexts } from "@/content/i18n";
import { presetsForAge } from "@/lib/data";
import type { Scenario } from "@/lib/types";
import { ScenarioArt } from "./ScenarioArt";

export function ScenarioPicker({ ageYears, onPick, resolve }: {
  ageYears: number; onPick(s: Scenario): void; resolve(s: Scenario): Scenario;
}) {
  const { scenario } = useTexts();
  return (
    <div className="grid grid-cols-1 gap-3 pt-5 md:grid-cols-3">
      {presetsForAge(ageYears).map((preset) => {
        const s = resolve(preset);
        return (
          <button key={preset.id} type="button" className="card scene-card" onClick={() => onPick(s)}>
            <ScenarioArt id={preset.id} className="scene-art" />
            <span className="scene-body">
              <h3 className="text-lg">{scenario(preset).title}</h3>
              <span className="text-sm text-muted">{scenario(preset).setting}</span>
              <span className="scene-quote" lang="en">“{preset.openingLine}”</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
