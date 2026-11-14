"use client";

import Link from "next/link";
import { useCopy } from "@/content/i18n";

export function Footer() {
  const copy = useCopy();
  return (
    <footer className="mt-14 border-t border-line">
      <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-3 py-6 pb-8 text-sm text-muted">
        <span>{copy.disclaimer.short}</span>
        <nav aria-label="Footer" className="ml-auto flex gap-4">
          <Link href="/approach" className="text-muted">{copy.nav.approach}</Link>
          <Link href="/pricing" className="text-muted">{copy.nav.pricing}</Link>
        </nav>
      </div>
    </footer>
  );
}
