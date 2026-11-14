"use client";

import { useCopy } from "@/content/i18n";

const SKIN = "#F3CDA9";
const SKIN_EDGE = "#E2AE86";
const HAIR = "#5E5752";
const BEARD = "#7B736C";

/**
 * Sebastian, the AI coach. Flat SVG in the same style as the practice child, so the two read as
 * one cast. Warm accent halo (the child uses mood colors). Pure markup, safe on the server.
 */
export function SebastianAvatar({ size = 96, decorative = false }: { size?: number; decorative?: boolean }) {
  const copy = useCopy();
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": `${copy.coach.name}, ${copy.coach.role}` };
  return (
    <span className="avatar inline-flex flex-none" {...a11y}>
      <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
        <g>
          <circle cx="100" cy="100" r="96" fill="#FFF1E7" />
          <rect x="87" y="128" width="26" height="26" rx="8" fill="#E8B48E" />
          {/* Shoulders end on the badge's own arc, so no clip path (and no duplicate ids) is needed. */}
          <path d="M34.3 170 Q44 151 100 149 Q156 151 165.7 170 A96 96 0 0 1 34.3 170 Z" fill="#3A4A7A" />
          <path d="M84 151 L100 170 L116 151 Z" fill="#FFFFFF" opacity="0.9" />
          <circle cx="57" cy="102" r="9" fill={SKIN} />
          <circle cx="143" cy="102" r="9" fill={SKIN} />
          <ellipse cx="100" cy="98" rx="44" ry="50" fill={SKIN} stroke={SKIN_EDGE} strokeWidth="2" />
          <path d="M56 94 Q53 46 100 44 Q147 46 144 94 Q141 68 120 63 Q101 72 78 64 Q60 70 56 94 Z" fill={HAIR} />
          <path d="M58 104 Q60 148 100 152 Q140 148 142 104 Q133 130 100 132 Q67 130 58 104 Z" fill={BEARD} />
          <path d="M82 117 Q100 107 118 117 Q100 113 82 117 Z" fill={BEARD} />
          <path d="M71 81 Q81 76 91 80" stroke="#4A4542" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M109 80 Q119 76 129 81" stroke="#4A4542" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <circle cx="81" cy="97" r="13" fill="#FFFFFF" fillOpacity="0.3" stroke="#1B2140" strokeWidth="3" />
          <circle cx="119" cy="97" r="13" fill="#FFFFFF" fillOpacity="0.3" stroke="#1B2140" strokeWidth="3" />
          <path d="M94 96 Q100 92 106 96" stroke="#1B2140" strokeWidth="3" fill="none" />
          <circle cx="81" cy="98" r="3.6" fill="#1B2140" />
          <circle cx="119" cy="98" r="3.6" fill="#1B2140" />
          <g className="mouth">
            <path d="M88 124 Q100 133 112 124" stroke="#5A2A2A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </span>
  );
}
