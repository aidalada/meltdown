import type { JSX } from "react";

/*
 * Illustrations for the common moments. Drawn here in SVG, so there are no photo rights to clear
 * and the cards stay sharp on every screen. Decorative: the card title says what the moment is.
 */

const W = 320;
const H = 150;

function Sky({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky-${id})`} />
    </>
  );
}

function Bedtime() {
  return (
    <>
      <Sky id="bed" from="#2B3A8F" to="#5B6FE0" />
      {[[40, 30], [78, 18], [120, 40], [250, 22], [286, 52], [210, 46]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#FFF6C9" />)}
      <circle cx="262" cy="44" r="22" fill="#FFE27A" />
      <circle cx="273" cy="36" r="19" fill="#3647A1" />
      <rect x="0" y="122" width={W} height="28" fill="#3A4AB0" />
      <g transform="translate(150 92) rotate(-28)">
        <rect x="-70" y="-8" width="120" height="16" rx="8" fill="#4C9AFF" />
        <rect x="40" y="-14" width="44" height="28" rx="8" fill="#FFFFFF" />
        {[46, 54, 62, 70, 78].map((x) => <rect key={x} x={x} y="-24" width="5" height="14" rx="2" fill="#7FE3FF" />)}
        <path d="M44 -26 q10 -12 20 0 q10 -12 20 0" fill="#FFFFFF" />
      </g>
      {[[96, 70, 9], [112, 52, 6], [84, 48, 5]].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="none" stroke="#BFE9FF" strokeWidth="2" />)}
    </>
  );
}

function Playground() {
  return (
    <>
      <Sky id="park" from="#7CC4FF" to="#D8F0FF" />
      <circle cx="54" cy="40" r="20" fill="#FFC53D" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect key={a} x="52" y="8" width="4" height="10" rx="2" fill="#FFC53D" transform={`rotate(${a} 54 40)`} />
      ))}
      <ellipse cx="210" cy="38" rx="34" ry="12" fill="#FFFFFF" />
      <ellipse cx="236" cy="32" rx="22" ry="12" fill="#FFFFFF" />
      <rect x="0" y="118" width={W} height="32" fill="#5CC97B" />
      <rect x="150" y="50" width="8" height="70" fill="#FF6B6B" />
      <rect x="178" y="50" width="8" height="70" fill="#FF6B6B" />
      {[64, 80, 96, 112].map((y) => <rect key={y} x="150" y={y} width="36" height="5" fill="#FF6B6B" />)}
      <rect x="146" y="44" width="44" height="10" rx="4" fill="#E2454F" />
      <path d="M186 50 Q232 56 246 96 Q252 114 284 118 L284 126 Q244 124 236 100 Q224 64 186 60 Z" fill="#FF9F43" />
    </>
  );
}

function Dressing() {
  return (
    <>
      <Sky id="dress" from="#FFD3B8" to="#FFF0E6" />
      <path d="M76 44 L104 32 Q118 46 132 32 L160 44 L176 72 L156 82 L150 70 L150 124 L86 124 L86 70 L80 82 L60 72 Z" fill="#4C9AFF" />
      <rect x="86" y="84" width="64" height="10" fill="#FFFFFF" opacity="0.8" />
      <path d="M196 112 q0 -18 18 -18 h10 q8 0 10 10 l2 8 q22 2 26 14 v6 h-66 Z" fill="#FF5C9A" />
      <path d="M196 132 h66" stroke="#C93D77" strokeWidth="5" strokeLinecap="round" />
      <circle cx="262" cy="46" r="22" fill="#FFFFFF" stroke="#2C2F5A" strokeWidth="4" />
      <path d="M262 46 V32 M262 46 L272 52" stroke="#2C2F5A" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

function Screens() {
  return (
    <>
      <Sky id="screen" from="#C3B4FF" to="#EEE9FF" />
      <rect x="82" y="26" width="104" height="100" rx="14" fill="#2C2F5A" />
      <rect x="92" y="36" width="84" height="74" rx="6" fill="#7C5CFF" />
      <path d="M124 58 L150 73 L124 88 Z" fill="#FFFFFF" />
      <circle cx="134" cy="118" r="3.5" fill="#8E92C7" />
      <circle cx="238" cy="96" r="34" fill="#FFFFFF" />
      <circle cx="238" cy="96" r="22" fill="#FFE8D6" />
      <rect x="282" y="66" width="6" height="60" rx="3" fill="#B7BCD9" />
      <rect x="190" y="66" width="6" height="60" rx="3" fill="#B7BCD9" />
    </>
  );
}

function Toys() {
  return (
    <>
      <Sky id="toys" from="#FFE27A" to="#FFF6CC" />
      <rect x="0" y="122" width={W} height="28" fill="#F5C842" />
      <rect x="60" y="86" width="38" height="38" rx="6" fill="#FF6B6B" />
      <rect x="102" y="86" width="38" height="38" rx="6" fill="#4C9AFF" />
      <rect x="80" y="46" width="38" height="38" rx="6" fill="#2BC48A" />
      <circle cx="226" cy="58" r="13" fill="#B97A4A" />
      <circle cx="262" cy="58" r="13" fill="#B97A4A" />
      <circle cx="244" cy="80" r="30" fill="#C98B59" />
      <circle cx="244" cy="118" r="26" fill="#C98B59" />
      <circle cx="234" cy="76" r="4" fill="#3B2A1E" />
      <circle cx="254" cy="76" r="4" fill="#3B2A1E" />
      <ellipse cx="244" cy="88" rx="9" ry="6" fill="#F2D3B3" />
    </>
  );
}

function Homework() {
  return (
    <>
      <Sky id="home" from="#A8EBC8" to="#E5FAEF" />
      <g transform="rotate(-6 140 80)">
        <rect x="74" y="28" width="132" height="100" rx="8" fill="#FFFFFF" />
        {[52, 68, 84, 100, 116].map((y) => <rect key={y} x="94" y={y} width="96" height="3" rx="1.5" fill="#BFD9FF" />)}
        {[40, 60, 80, 100, 120].map((y) => <circle key={y} cx="84" cy={y} r="4" fill="#9AA3C7" />)}
      </g>
      <g transform="translate(236 92) rotate(40)">
        <rect x="-8" y="-48" width="16" height="78" rx="3" fill="#FFC53D" />
        <path d="M-8 30 L0 46 L8 30 Z" fill="#F2D3B3" />
        <rect x="-8" y="-56" width="16" height="10" rx="3" fill="#FF5C9A" />
      </g>
      <circle cx="268" cy="38" r="16" fill="#FFFFFF" />
      <path d="M262 33 q6 -8 12 0 q0 5 -6 7 v4" stroke="#7C5CFF" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </>
  );
}

const SCENES: Record<string, () => JSX.Element> = {
  "teeth-bedtime": Bedtime,
  "leaving-playground": Playground,
  "getting-dressed": Dressing,
  "screen-time-off": Screens,
  "sibling-fight": Toys,
  "homework-meltdown": Homework,
};

export function ScenarioArt({ id, className }: { id: string; className?: string }) {
  const Scene = SCENES[id] ?? Bedtime;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Scene />
    </svg>
  );
}

/** Waves for the SOS sound button. The wave paths drift when motion is allowed. */
export function WavesArt({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 320 120" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9FE3FF" />
          <stop offset="1" stopColor="#E6F8FF" />
        </linearGradient>
      </defs>
      <rect width="320" height="120" fill="url(#sea)" />
      <circle cx="262" cy="34" r="18" fill="#FFD66B" />
      <g className={playing ? "waves waves-on" : "waves"}>
        <path className="wave wave-1" d="M-40 70 q40 -16 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 V120 H-40 Z" fill="#5BC8F5" opacity="0.65" />
        <path className="wave wave-2" d="M-40 84 q40 -14 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 V120 H-40 Z" fill="#2FA7E0" opacity="0.8" />
        <path className="wave wave-3" d="M-40 98 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 V120 H-40 Z" fill="#1A86C7" />
      </g>
    </svg>
  );
}
