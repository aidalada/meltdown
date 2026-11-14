/*
 * Bedtime scene: a parent kneels to the child's eye level and talks calmly; the child is still
 * teary but softening. Same flat style and skin tones as ChildAvatar and SebastianAvatar.
 * It shows the behavior we teach (connect first), not the fight. Pure SVG, safe on the server.
 */
const SKIN_PARENT = "#F3CDA9";
const SKIN_CHILD = "#FFD7B0";
const EDGE = "#E2AE86";

export function FamilyScene({ label, className }: { label: string; className?: string }) {
  return (
    <svg viewBox="0 0 360 300" className={className} role="img" aria-label={label}>
      {/* evening: warm room, moon and stars */}
      <circle cx="180" cy="160" r="132" fill="#FFF1E7" />
      <circle cx="292" cy="62" r="20" fill="#FFE2A8" />
      <circle cx="301" cy="55" r="17" fill="#FFF1E7" />
      <path d="M58 70l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" fill="#F5A524" opacity="0.7" />
      <path d="M250 104l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z" fill="#F5A524" opacity="0.55" />
      <ellipse cx="180" cy="266" rx="132" ry="12" fill="#EFE3D3" />

      {/* parent, kneeling, facing the child */}
      <path d="M86 266c0-26 8-40 30-42h52c12 0 16 8 16 20v22Z" fill="#3A4A7A" />
      <path d="M92 232c-2-44 12-68 44-72 32 4 42 28 40 72Z" fill="#4C9AFF" />
      <rect x="124" y="140" width="22" height="22" rx="8" fill="#E8B48E" />
      <path d="M160 182c18 4 34 6 52 6" stroke="#4C9AFF" strokeWidth="17" strokeLinecap="round" fill="none" />
      <circle cx="214" cy="188" r="9" fill={SKIN_PARENT} />
      <path d="M100 132c-4-34 12-50 36-50s40 16 36 50c0 18-6 30-12 36 4-20 2-36-6-46-12 6-30 8-44 4-6 10-8 24-4 42-6-8-8-22-6-36Z" fill="#6B3E26" />
      <circle cx="136" cy="122" r="30" fill={SKIN_PARENT} stroke={EDGE} strokeWidth="2" />
      <path d="M106 116c2-22 16-32 32-32 14 0 26 8 28 24-12-8-30-6-44 0-6 2-12 4-16 8Z" fill="#6B3E26" />
      <path d="M134 122q4-4 8 0M150 122q4-4 8 0" stroke="#1B2140" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M140 136q8 6 16 0" stroke="#7A2E2E" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="160" cy="132" r="5" fill="#FF9AA2" opacity="0.45" />

      {/* child, standing, still teary but softening */}
      <rect x="208" y="222" width="13" height="44" rx="6" fill="#3A4A7A" />
      <rect x="226" y="222" width="13" height="44" rx="6" fill="#3A4A7A" />
      <rect x="198" y="168" width="50" height="64" rx="20" fill="#F5A524" />
      <circle cx="198" cy="190" r="8" fill={SKIN_CHILD} />
      <circle cx="223" cy="136" r="32" fill={SKIN_CHILD} stroke={EDGE} strokeWidth="2" />
      <path d="M190 132q2-34 33-35 31 1 33 35-6-16-33-17-27 1-33 17Z" fill="#5A3E2B" />
      <path d="M206 126l9-2M226 124l9 2" stroke="#5A3E2B" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="210" cy="136" rx="4.5" ry="6" fill="#1B2140" />
      <ellipse cx="229" cy="136" rx="4.5" ry="6" fill="#1B2140" />
      <path d="M205 146q-2 5 0 8q2-3 0-8Z" fill="#6EC1FF" />
      <path d="M212 154q8 3 15 0" stroke="#7A2E2E" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* a calm word between them */}
      <g transform="translate(150 40)">
        <rect width="64" height="40" rx="14" fill="#FFFFFF" stroke="#EBE3D8" strokeWidth="2" />
        <path d="M14 38l-4 12 14-10" fill="#FFFFFF" stroke="#EBE3D8" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 39h12" stroke="#FFFFFF" strokeWidth="3" />
        <path d="M32 29c6-5 10-8 10-12a5 5 0 0 0-10-1 5 5 0 0 0-10 1c0 4 4 7 10 12Z" fill="#E5484D" />
      </g>
    </svg>
  );
}
