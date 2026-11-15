"use client";

import { useCopy } from "@/content/i18n";
import { GROWTH_STAGES, type Growth, type GrowthStage } from "@/lib/progress";
import type { AgeGroup } from "@/lib/types";
import { ChildAvatar } from "./ChildAvatar";
import { SKILL_COLOR } from "./SkillRadar";

const AGE: Record<GrowthStage, { age: AgeGroup; look?: "baby" | "teen" }> = {
  baby: { age: "toddler", look: "baby" },
  toddler: { age: "toddler" },
  preschool: { age: "preschool" },
  school: { age: "school" },
  teen: { age: "preteen", look: "teen" },
};

/** A small game: this child grows up, and smiles more, as the parent's skills grow. */
export function GrowingChild({ growth, girl }: { growth: Growth; girl: boolean }) {
  const copy = useCopy();
  const p = copy.progress;
  const index = GROWTH_STAGES.indexOf(growth.stage);
  const next = GROWTH_STAGES[index + 1];
  const look = AGE[growth.stage];
  return (
    <section className="card growth-card" aria-labelledby="growth-title">
      <div className="growth-stage">
        <ChildAvatar band={growth.mood} speaking={false} thinking={false} name={p.growthStages[growth.stage]} age={look.age} look={look.look} girl={girl} size={168} showName={false} />
      </div>
      <div className="grid min-w-0 gap-2.5">
        <h2 id="growth-title" className="text-[22px]">{p.growthTitle}</h2>
        <p className="flex flex-wrap items-center gap-2">
          <span className="pill pill-primary">{p.growthStages[growth.stage]}</span>
          <span className="font-semibold">{p.growthMood[growth.mood]}</span>
        </p>
        <ol className="growth-steps" aria-label={p.growthTitle}>
          {GROWTH_STAGES.map((stage, i) => (
            <li key={stage} className={i <= index ? "done" : ""} aria-current={i === index ? "step" : undefined}>
              <span className="sr-only">{p.growthStages[stage]}</span>
            </li>
          ))}
        </ol>
        {next ? (
          <div className="grid gap-1.5">
            <p className="text-sm font-semibold">{p.growthNext(p.growthStages[next])}</p>
            <span className="growth-bar" aria-hidden="true"><span style={{ width: `${Math.max(4, Math.round(growth.toNext * 100))}%` }} /></span>
            <p className="text-[13px] text-muted">
              {growth.rehearsalsNeeded > 0 ? p.growthRehearse(growth.rehearsalsNeeded) : p.growthFocus(p.skills[growth.focus])}
            </p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-good-text">{p.growthTop}</p>
        )}
        <p className="text-[13px] text-muted">
          <i className="skill-dot mr-1.5 align-middle" style={{ background: SKILL_COLOR.control }} aria-hidden="true" />
          {p.growthHow}
        </p>
      </div>
    </section>
  );
}
