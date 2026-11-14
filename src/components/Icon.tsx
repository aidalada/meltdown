import type { ReactNode } from "react";

/*
 * One small icon set for the whole app: 24 px grid, 2 px round strokes, currentColor.
 * Inline SVG (no icon library, CLAUDE.md rule 2) and no hooks, so server pages can use it too.
 */
const PATHS = {
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12Z" />,
  say: <><path d="M21 14a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" /><path d="M9 9h7M9 12h4" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5-6-3.5Z" /></>,
  sos: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6" /></>,
  progress: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  sunrise: <><path d="M3 19h18M7 19a5 5 0 0 1 10 0M12 4v4M4.9 11.1l1.4 1.4M19.1 11.1l-1.4 1.4M9 6l3-2 3 2" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  toothbrush: <><rect x="9" y="8" width="6" height="4" rx="1" /><path d="M10 8V4.5M12 8V3.5M14 8V4.5M12 12v9" /></>,
  slide: <><path d="M5 21V5M9 21V5M5 9h4M5 13h4M5 17h4M9 5c4.5 0 5.5 4 7.5 9s3 6 4.5 6" /></>,
  shirt: <path d="M8 4 3 7l2 4 2-1v10h10V10l2 1 2-4-5-3c-.6 1.5-2.1 2.5-4 2.5S8.6 5.5 8 4Z" />,
  tablet: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M11 18h2" /></>,
  blocks: <><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /><rect x="8" y="4" width="8" height="8" rx="1.5" /></>,
  book: <><path d="M12 6.5C10 5 7 4.5 4 5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Z" /><path d="M12 6.5V20" /></>,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  repeat: <><path d="m17 2 4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
  heart: <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3C14.7 3 13.5 3.5 12 5c-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
  sound: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>,
  soundOff: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m22 9-6 6M16 9l6 6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

/** Decorative by default; pass `label` when the icon is the only content of a control. */
export function Icon({ name, size = 24, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {PATHS[name]}
    </svg>
  );
}

/** One symbol per common moment, so cards and starters can be told apart at a glance. */
const SCENARIO_ICON: Record<string, IconName> = {
  "teeth-bedtime": "toothbrush",
  "leaving-playground": "slide",
  "getting-dressed": "shirt",
  "screen-time-off": "tablet",
  "sibling-fight": "blocks",
  "homework-meltdown": "book",
};

export function scenarioIcon(id: string | undefined): IconName {
  return (id && SCENARIO_ICON[id]) || "heart";
}
