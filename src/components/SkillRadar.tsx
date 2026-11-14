"use client";

import { useCopy } from "@/content/i18n";
import { SKILLS, type Skill } from "@/lib/progress";

/*
 * Four core skills on a radar (diamond) chart. Hand-drawn SVG: no charting library (CLAUDE.md rule 2).
 * Axes run up, right, down, left in SKILLS order, with the two long labels on the vertical axis,
 * where they have the full width. The list under the chart carries the same numbers as text.
 */
const W = 372, H = 290, CX = W / 2, CY = H / 2, R = 88;
const AXES: readonly [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const RINGS = [25, 50, 75, 100];

const point = (axis: number, value: number) => `${CX + AXES[axis][0] * R * (value / 100)},${CY + AXES[axis][1] * R * (value / 100)}`;
const ring = (value: number) => AXES.map((_, i) => point(i, value)).join(" ");

export function SkillRadar({ scores }: { scores: Record<Skill, number> }) {
  const copy = useCopy();
  const labels = copy.progress.skills;
  const summary = SKILLS.map((s) => `${labels[s]} ${scores[s]}`).join(", ");
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[380px]" role="img" aria-label={summary}>
        {RINGS.map((v) => (
          <polygon key={v} points={ring(v)} fill={v === 100 ? "var(--color-bg)" : "none"} stroke="var(--color-line)" strokeWidth={v === 100 ? 2 : 1} />
        ))}
        {AXES.map((_, i) => <line key={i} x1={CX} y1={CY} x2={point(i, 100).split(",")[0]} y2={point(i, 100).split(",")[1]} stroke="var(--color-line)" />)}
        <polygon
          points={SKILLS.map((s, i) => point(i, scores[s])).join(" ")}
          fill="var(--color-primary)" fillOpacity="0.18" stroke="var(--color-primary)" strokeWidth="3" strokeLinejoin="round"
        />
        {SKILLS.map((s, i) => {
          const [x, y] = point(i, scores[s]).split(",");
          return <circle key={s} cx={x} cy={y} r="5" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="3" />;
        })}
        <g className="radar-label" aria-hidden="true">
          <text x={CX} y={CY - R - 14} textAnchor="middle">{labels[SKILLS[0]]}</text>
          <text x={CX + R + 10} y={CY + 4} textAnchor="start">{labels[SKILLS[1]]}</text>
          <text x={CX} y={CY + R + 24} textAnchor="middle">{labels[SKILLS[2]]}</text>
          <text x={CX - R - 10} y={CY + 4} textAnchor="end">{labels[SKILLS[3]]}</text>
        </g>
      </svg>
      <ul className="m-0 grid list-none gap-2.5 p-0">
        {SKILLS.map((s) => (
          <li key={s} className="grid gap-1">
            <span className="flex items-baseline justify-between gap-3 text-[15px] font-semibold">
              {labels[s]}
              <span className="font-display text-lg font-extrabold tabular-nums">{scores[s]}</span>
            </span>
            <span className="skill-bar" aria-hidden="true"><span style={{ width: `${scores[s]}%` }} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
