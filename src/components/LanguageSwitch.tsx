"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCopy, useLocale } from "@/content/i18n";
import { LOCALE_COOKIE, LOCALES, parseLocale, type Locale } from "@/content/locale";

function remember(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * EN | RU toggle. The choice lives in a cookie so the server renders the right language on the next
 * request; router.refresh() re-renders the current page without losing client state.
 * A `?lang=ru` link switches straight to Russian (handy for the jury).
 */
export function LanguageSwitch() {
  const locale = useLocale();
  const copy = useCopy();
  const router = useRouter();

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get("lang");
    if (!asked) return;
    const wanted = parseLocale(asked);
    if (wanted === locale) return;
    remember(wanted);
    router.refresh();
  }, [locale, router]);

  function choose(next: Locale) {
    if (next === locale) return;
    remember(next);
    router.refresh();
  }

  return (
    <div className="lang-switch" role="group" aria-label={copy.nav.language}>
      {LOCALES.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === locale} onClick={() => choose(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
