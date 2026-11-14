"use client";

import { createContext, useContext, type ReactNode } from "react";
import { textsFor, type Copy, type Locale, type Texts } from "./locale";

const LocaleContext = createContext<Locale>("en");

/** Set once in the root layout from the language cookie, so the server and client render the same words. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** UI copy, plus technique and scenario wording, in the active language. */
export function useTexts(): Texts {
  return textsFor(useLocale());
}

export function useCopy(): Copy {
  return useTexts().copy;
}
