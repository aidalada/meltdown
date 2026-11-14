"use client";

import Link from "next/link";
import { copy } from "@/content/copy";
import { useOffline } from "@/hooks/useOffline";
import { MOOD_COLOR } from "./ChildAvatar";
import { SebastianAvatar } from "./SebastianAvatar";

export function Header() {
  const offline = useOffline();
  return (
    <header>
      <div className="wrap flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 py-2">
        <Link className="logo" href="/" aria-label={`${copy.brand.name} home`}>
          <span className="logo-mark" aria-hidden="true">
            <i style={{ background: MOOD_COLOR.meltdown }} />
            <i style={{ background: MOOD_COLOR.grumpy }} />
            <i style={{ background: MOOD_COLOR.calm }} />
          </span>
          {copy.brand.name}
        </Link>
        {/* Below 640 px the BottomNav tab bar carries navigation, so the header keeps only the logo. */}
        <nav aria-label={copy.nav.label} className="ml-auto flex flex-wrap items-center justify-end gap-1">
          {offline && <span className="pill pill-accent">{copy.rehearsal.offline}</span>}
          <Link className="nav-link hidden sm:inline-flex" href="/practice">{copy.nav.startShort}</Link>
          <Link className="nav-link hidden sm:inline-flex" href="/progress">{copy.nav.progress}</Link>
          <Link className="nav-link hidden md:inline-flex" href="/pricing">{copy.nav.pricing}</Link>
          <Link className="nav-link hidden md:inline-flex" href="/approach">{copy.nav.approach}</Link>
          <Link className="btn btn-primary hidden min-h-11 pr-[18px] pl-1.5 sm:inline-flex" href="/coach">
            <SebastianAvatar size={32} decorative />
            {copy.coach.cta}
          </Link>
        </nav>
      </div>
    </header>
  );
}
