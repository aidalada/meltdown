"use client";

import { useCopy } from "@/content/i18n";
import type { AgeGroup, MoodBand } from "@/lib/types";

export const MOOD_COLOR: Record<MoodBand, string> = {
  meltdown: "#E5484D", upset: "#F76B15", grumpy: "#F5A524", warming: "#4C9AFF", calm: "#30A46C",
};

/*
 * The child grows with the chosen age range. Only the hair and extras change; brows, eyes and
 * mouth keep the same geometry, because they carry the mood (SPEC 13.3).
 * toddler: a single tuft · preschool: a soft cap · school: side part, cowlick, freckles ·
 * preteen: longer swept hair and headphones.
 */
const HAIR: Record<AgeGroup, string> = {
  toddler: "M86 54 Q80 36 96 28 Q94 38 104 30 Q104 40 116 38 Q110 46 116 54 Q100 46 86 54 Z",
  preschool: "M40 95 Q45 35 100 32 Q155 35 160 95 Q150 60 100 58 Q50 60 40 95 Z",
  school: "M38 100 Q38 30 100 30 Q162 30 162 100 Q156 64 122 58 Q100 68 72 58 Q46 66 38 100 Z",
  preteen: "M34 112 Q30 26 100 24 Q170 26 166 112 Q162 76 138 62 Q104 84 60 64 Q42 78 34 112 Z",
};
const HAIR_COLOR = "#5A3E2B";
const FRECKLES = [[61, 123], [67, 127], [73, 122], [127, 122], [133, 127], [139, 123]];
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
  /** Age range of the child; changes the look. Defaults to the preschooler from the demo. */
  age?: AgeGroup;
  size?: number;
  showName?: boolean;
  pop?: boolean;
  /** True when nearby text already names the child (age buttons, memory panel). */
  decorative?: boolean;
  /** A daughter: pigtails for the little ones, longer hair later, and a bow. */
  girl?: boolean;
  /** The growing child on Progress: a baby (one curl, a bib) or a teen (no headphones, a hoodie). */
  look?: "baby" | "teen";
}

const BOW = "#FF5C9A";

/** Pigtails or long hair, drawn behind the head. */
function GirlHair({ age }: { age: AgeGroup }) {
  const little = age === "toddler" || age === "preschool";
  return (
    <>
      {little ? (
        <>
          <ellipse cx="40" cy="76" rx="15" ry="19" fill={HAIR_COLOR} transform="rotate(-25 40 76)" />
          <ellipse cx="160" cy="76" rx="15" ry="19" fill={HAIR_COLOR} transform="rotate(25 160 76)" />
          <circle cx="50" cy="66" r="5" fill={BOW} />
          <circle cx="150" cy="66" r="5" fill={BOW} />
        </>
      ) : (
        <>
          <path d="M40 92 Q28 132 36 172 Q46 160 50 140 Q46 118 52 96 Z" fill={HAIR_COLOR} />
          <path d="M160 92 Q172 132 164 172 Q154 160 150 140 Q154 118 148 96 Z" fill={HAIR_COLOR} />
        </>
      )}
    </>
  );
}

/** A bow on top of the hair, so a daughter reads as a girl at a glance. */
function Bow() {
  return (
    <g transform="translate(128 42) rotate(18)">
      <path d="M0 0 L-16 -9 L-16 9 Z" fill={BOW} />
      <path d="M0 0 L16 -9 L16 9 Z" fill={BOW} />
      <circle cx="0" cy="0" r="4.5" fill="#E2457F" />
    </g>
  );
}

/** 2D practice child (SPEC 13.3). Pure SVG, safe to render on the server. */
export function ChildAvatar({ band, speaking, thinking, name, age = "preschool", size = 220, showName = true, pop = false, decorative = false, girl = false, look }: ChildAvatarProps) {
  const copy = useCopy();
  const dx = thinking ? 3 : 0;
  const dy = thinking ? -4 : 0;
  const [browL, browR] = BROWS[band];
  const classes = ["avatar", "flex flex-col items-center gap-2", speaking ? "avatar-speaking" : "", pop ? "avatar-pop" : ""].join(" ");
  return (
    <div className={classes}>
      <div className="avatar-slot" {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": `${name}, ${copy.bands[band]}` })}>
        <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
          <circle className="halo" cx="100" cy="100" r="96" fill={MOOD_COLOR[band]} opacity="0.15" />
          <g className="face">
            {girl && <GirlHair age={age} />}
            <circle cx="38" cy="110" r="10" fill="#FFD7B0" />
            <circle cx="162" cy="110" r="10" fill="#FFD7B0" />
            <circle cx="100" cy="108" r="62" fill="#FFD7B0" stroke="#E8B98E" strokeWidth="2" />
            {look === "baby"
              ? <path d="M100 47 Q90 30 101 25 Q112 22 110 32 Q108 38 101 36" stroke={HAIR_COLOR} strokeWidth="5" fill="none" strokeLinecap="round" />
              : <path d={HAIR[age]} fill={HAIR_COLOR} />}
            {girl && <Bow />}
            {look === "baby" && (
              <>
                <path d="M70 162 Q100 190 130 162 Q122 182 100 186 Q78 182 70 162 Z" fill="#FFFFFF" stroke="#BFD9FF" strokeWidth="3" />
                <circle cx="100" cy="176" r="3" fill="#FF9AA2" />
              </>
            )}
            {look === "teen" && (
              <>
                <path d="M52 182 Q100 204 148 182 L156 200 L44 200 Z" fill="#7C5CFF" />
                <path d="M88 186 v10 M112 186 v10" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              </>
            )}
            {age === "school" && (
              <>
                <path d="M94 33 Q98 15 112 19 Q105 24 108 33 Z" fill={HAIR_COLOR} />
                {FRECKLES.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" fill="#D9965F" />)}
              </>
            )}
            {age === "preteen" && look !== "teen" && (
              <>
                <path d="M29 104 Q29 11 100 11 Q171 11 171 104" stroke="#3A4A7A" strokeWidth="8" fill="none" strokeLinecap="round" />
                <rect x="19" y="92" width="19" height="36" rx="8" fill="#3A4A7A" />
                <rect x="162" y="92" width="19" height="36" rx="8" fill="#3A4A7A" />
                <rect x="23" y="99" width="5" height="22" rx="2.5" fill="#FF8A3D" />
                <rect x="172" y="99" width="5" height="22" rx="2.5" fill="#FF8A3D" />
              </>
            )}
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
