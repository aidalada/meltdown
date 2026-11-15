"use client";

import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/content/i18n";
import { bandOf, clamp } from "@/lib/engine/mood";
import type { MoodBand } from "@/lib/types";
import { MOOD_COLOR } from "./ChildAvatar";
import { signed } from "./TagChip";

export interface ChartPoint { turn: number; mood: number; delta?: number; text?: string }

const H = 240, L = 40, R = 16, T = 16, B = 28;
const BAND_RANGES: [number, number, MoodBand][] = [
  [0, 20.5, "meltdown"], [20.5, 40.5, "upset"], [40.5, 60.5, "grumpy"], [60.5, 79.5, "warming"], [79.5, 100, "calm"],
];
const TEXT = { fontSize: 12, fontFamily: "var(--font-sans)" } as const;

/** SVG calm chart (SPEC 13.5). Width follows the container (300–600) so labels stay 12 px on phones. */
export function MoodChart({ points }: { points: ChartPoint[] }) {
  const copy = useCopy();
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.round(clamp(entry.contentRect.width, 300, 600))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const iw = W - L - R, ih = H - T - B;
  const n = Math.max(points.length - 1, 1);
  const x = (i: number) => L + (i / n) * iw;
  const y = (v: number) => T + (1 - v / 100) * ih;

  return (
    <div ref={box} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={copy.debrief.chartTitle} className="block h-auto">
        {BAND_RANGES.map(([a, b, band]) => (
          <rect key={band} x={L} y={y(b)} width={iw} height={y(a) - y(b)} fill={MOOD_COLOR[band]} opacity={0.08} />
        ))}
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <text key={v} x={L - 8} y={y(v) + 4} textAnchor="end" fill="#655C55" style={TEXT}>{v}</text>
        ))}
        <line x1={L} x2={W - R} y1={y(80)} y2={y(80)} stroke="#30A46C" strokeWidth={1.5} strokeDasharray="5 5" />
        <text x={L + 6} y={y(80) - 6} fill="#17704A" fontWeight={600} style={TEXT}>{copy.bands.calm}</text>
        {points.map((p, i) => (
          <text key={`x${i}`} x={x(i)} y={H - 8} textAnchor="middle" fill="#655C55" style={TEXT}>
            {i === 0 ? copy.debrief.chartStart : p.turn}
          </text>
        ))}
        <polyline points={points.map((p, i) => `${x(i)},${y(p.mood)}`).join(" ")} fill="none" stroke="#1B2140" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={`p${i}`}>
            <title>{p.text ?? copy.debrief.statStart}</title>
            <circle cx={x(i)} cy={y(p.mood)} r={5} fill={MOOD_COLOR[bandOf(p.mood)]} stroke="#FFFFFF" strokeWidth={2} />
            {i > 0 && p.delta !== undefined && (
              <text x={x(i)} y={clamp(y(p.mood) + (p.delta >= 0 ? -12 : 20), T + 10, H - B - 4)} textAnchor="middle" fontWeight={700}
                fill={p.delta > 0 ? "#17704A" : p.delta < 0 ? "#B3282E" : "#655C55"} style={TEXT}>
                {signed(p.delta)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
