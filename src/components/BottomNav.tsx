"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCopy } from "@/content/i18n";

const ICON = { viewBox: "0 0 24 24", width: 24, height: 24, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const TABS: { href: string; label: "coach" | "startShort" | "sos" | "progress"; icon: ReactNode; match(path: string): boolean }[] = [
  {
    href: "/coach", label: "coach", match: (p) => p.startsWith("/coach"),
    icon: <svg {...ICON} aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12Z" /></svg>,
  },
  {
    href: "/practice", label: "startShort", match: (p) => p === "/practice",
    icon: <svg {...ICON} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5-6-3.5Z" /></svg>,
  },
  {
    href: "/sos", label: "sos", match: (p) => p.startsWith("/sos"),
    icon: <svg {...ICON} className="sos-icon" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6" /></svg>,
  },
  {
    href: "/progress", label: "progress", match: (p) => p.startsWith("/progress"),
    icon: <svg {...ICON} aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  },
];

/**
 * Phone tab bar for the four parts of the loop. Hidden at 768 px and up (the header has the
 * links) and inside a rehearsal or debrief, where the rehearsal controls own the bottom edge.
 */
export function BottomNav() {
  const copy = useCopy();
  const path = usePathname();
  if (/^\/practice\/[^/]+/.test(path)) return null;
  return (
    <>
      <div className="bottom-nav-spacer" aria-hidden="true" />
      <nav className="bottom-nav" aria-label={copy.nav.tabs}>
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} aria-current={tab.match(path) ? "page" : undefined}>
            {tab.icon}
            {copy.nav[tab.label]}
          </Link>
        ))}
      </nav>
    </>
  );
}
