"use client";

import { useCopy } from "@/content/i18n";
import type { MoodBand } from "@/lib/types";

export const MOOD_COLOR: Record<MoodBand, string> = {
  meltdown: "#E5484D", upset: "#F76B15", grumpy: "#F5A524", warming: "#4C9AFF", calm: "#30A46C",
};

const HAIR = "M40 95 Q45 35 100 32 Q155 35 160 95 Q150 60 100 58 Q50 60 40 95 Z";
const BROWS: Record<MoodBand, [string, string]> = {
  calm: ["M68 88 Q78 83 88 88", "M112 88 Q122 83 132 88"],
  warming: ["M68 88 L88 87", "M112 87 L132 88"],
  grumpy: ["M68 86 L88 90", "M112 90 L132 86"],
  upset: ["M68 90 L88 84", "M112 84 L132 90"],
  meltdown: ["M66 92 L88 82", "M112 82 L134 92"],
};
const MOUTH: Record<Exclude<MoodBand, "meltdown">, string> = {
  calm: "M80 135 Q100 152 120 135",
  warming: "M84 138 Q100 144 116 138",
  grumpy: "M84 142 Q100 138 116 142",
  upset: "M82 146 Q100 132 118 146",
};
const drop = (x: number) => `M${x} 116 Q${x - 3} 124 ${x} 128 Q${x + 3} 124 ${x} 116 Z`;

export interface ChildAvatarProps {
  band: MoodBand;
  speaking: boolean;
  thinking: boolean;
  name: string;
  size?: number;
  showName?: boolean;
  pop?: boolean;
}

/** 2D practice child (SPEC 13.3). Pure SVG, safe to render on the server. */
export function ChildAvatar({ band, speaking, thinking, name, size = 220, showName = true, pop = false }: ChildAvatarProps) {
  const copy = useCopy();
  const dx = thinking ? 3 : 0;
  const dy = thinking ? -4 : 0;
  const [browL, browR] = BROWS[band];
  const classes = ["avatar", "flex flex-col items-center gap-2", speaking ? "avatar-speaking" : "", pop ? "avatar-pop" : ""].join(" ");
  return (
    <div className={classes}>
      <div className="avatar-slot" role="img" aria-label={`${name}, ${copy.bands[band]}`}>
        <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
          <circle className="halo" cx="100" cy="100" r="96" fill={MOOD_COLOR[band]} opacity="0.15" />
          <g className="face">
            <circle cx="38" cy="110" r="10" fill="#FFD7B0" />
            <circle cx="162" cy="110" r="10" fill="#FFD7B0" />
            <circle cx="100" cy="108" r="62" fill="#FFD7B0" stroke="#E8B98E" strokeWidth="2" />
            <path d={HAIR} fill="#5A3E2B" />
            <path d={browL} stroke="#5A3E2B" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d={browR} stroke="#5A3E2B" strokeWidth="4" fill="none" strokeLinecap="round" />
            {band === "meltdown" ? (
              <>
                <path d="M70 105 Q78 99 86 105" stroke="#1B2140" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M114 105 Q122 99 130 105" stroke="#1B2140" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx={78 + dx} cy={105 + dy} rx="7" ry="9" fill="#1B2140" />
                <ellipse cx={122 + dx} cy={105 + dy} rx="7" ry="9" fill="#1B2140" />
              </>
            )}
            {(band === "calm" || band === "warming") && (
              <>
                <circle cx="66" cy="128" r="8" fill="#FF9AA2" opacity="0.45" />
                <circle cx="134" cy="128" r="8" fill="#FF9AA2" opacity="0.45" />
              </>
            )}
            {band === "upset" && (
              <>
                <path d={drop(76)} fill="#6EC1FF" />
                <path d={drop(122)} fill="#6EC1FF" />
              </>
            )}
            {band === "meltdown" && (
              <>
                <path className="tear-fall" d={drop(76)} fill="#6EC1FF" />
                <path className="tear-fall tear-fall-late" d={drop(122)} fill="#6EC1FF" />
              </>
            )}
            <g className="mouth">
              {band === "meltdown" ? (
                <ellipse cx="100" cy="142" rx="16" ry="12" fill="#7A2E2E" />
              ) : (
                <path d={MOUTH[band]} stroke="#7A2E2E" strokeWidth="4" fill="none" strokeLinecap="round" />
              )}
            </g>
          </g>
          {thinking && (
            <g>
              <circle cx="150" cy="60" r="4" fill="#FFFFFF" stroke="#EBE3D8" strokeWidth="2" />
              <ellipse cx="170" cy="36" rx="26" ry="17" fill="#FFFFFF" stroke="#EBE3D8" strokeWidth="2" />
              <circle className="think-dot" cx="160" cy="36" r="3.5" fill="#655C55" />
              <circle className="think-dot think-dot-2" cx="170" cy="36" r="3.5" fill="#655C55" />
              <circle className="think-dot think-dot-3" cx="180" cy="36" r="3.5" fill="#655C55" />
            </g>
          )}
        </svg>
      </div>
      {showName && <p className="stage-name">{name}</p>}
    </div>
  );
}
