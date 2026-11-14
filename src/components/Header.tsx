"use client";

import Link from "next/link";
import { copy } from "@/content/copy";
import { useOffline } from "@/hooks/useOffline";
import { MOOD_COLOR } from "./ChildAvatar";

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
        <nav aria-label="Main" className="ml-auto flex flex-wrap items-center justify-end gap-1">
          {offline && <span className="pill pill-accent">{copy.rehearsal.offline}</span>}
          {/* Progress stays visible on phones: it is the way to /sos. */}
          <Link className="nav-link" href="/progress">{copy.nav.progress}</Link>
          <Link className="nav-link hidden sm:inline-flex" href="/pricing">{copy.nav.pricing}</Link>
          <Link className="nav-link hidden sm:inline-flex" href="/approach">{copy.nav.approach}</Link>
          <Link className="btn btn-primary min-h-11 px-3 sm:px-[18px]" href="/practice">
            <span className="sm:hidden">{copy.nav.startShort}</span>
            <span className="hidden sm:inline">{copy.nav.start}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
