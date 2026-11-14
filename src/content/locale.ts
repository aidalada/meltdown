import { TECHNIQUE_BY_TAG } from "@/lib/data";
import type { Scenario, TechniqueTag } from "@/lib/types";
import { copy as en } from "./copy";
import { ru } from "./copy.ru";
import { SCENARIOS_RU, TECHNIQUES_RU } from "./data.ru";

/*
 * Interface language. English is the product (US parents); Russian lets a Russian-speaking jury
 * follow the demo. The rehearsal dialogue itself stays English: the practice child speaks
 * English and the engine scores English phrases.
 */
export type Locale = "en" | "ru";
export const LOCALES: readonly Locale[] = ["en", "ru"];
export const LOCALE_COOKIE = "meltdown-lang";

export function parseLocale(value: string | null | undefined): Locale {
  return value === "ru" ? "ru" : "en";
}

/** The English copy with literal strings widened, so every language must have the same keys. */
type Widen<T> =
  T extends string ? string
  : T extends (...args: infer A) => infer R ? (...args: A) => Widen<R>
  : T extends readonly (infer U)[] ? readonly Widen<U>[]
  : T extends object ? { readonly [K in keyof T]: Widen<T[K]> }
  : T;
export type Copy = Widen<typeof en>;

export interface TechniqueText { label: string; shortTip: string; why: string }
export interface ScenarioText { title: string; setting: string }

/** Everything a screen needs to speak one language: UI copy plus technique and scenario wording. */
export interface Texts {
  locale: Locale;
  copy: Copy;
  technique(tag: TechniqueTag): TechniqueText;
  scenario(s: Pick<Scenario, "id" | "title" | "setting">): ScenarioText;
}

const COPY: Record<Locale, Copy> = { en, ru };

function techniqueText(locale: Locale, tag: TechniqueTag): TechniqueText {
  const base = TECHNIQUE_BY_TAG[tag];
  const local = locale === "ru" ? TECHNIQUES_RU[tag] : null;
  return local ?? { label: base.label, shortTip: base.shortTip, why: base.why };
}

function scenarioText(locale: Locale, s: Pick<Scenario, "id" | "title" | "setting">): ScenarioText {
  if (locale !== "ru") return { title: s.title, setting: s.setting };
  return SCENARIOS_RU.byId[s.id] ?? {
    title: SCENARIOS_RU.generic[s.title] ?? s.title,
    setting: SCENARIOS_RU.generic[s.setting] ?? s.setting,
  };
}

const TEXTS: Record<Locale, Texts> = {
  en: { locale: "en", copy: COPY.en, technique: (tag) => techniqueText("en", tag), scenario: (s) => scenarioText("en", s) },
  ru: { locale: "ru", copy: COPY.ru, technique: (tag) => techniqueText("ru", tag), scenario: (s) => scenarioText("ru", s) },
};

export function textsFor(locale: Locale): Texts {
  return TEXTS[locale];
}

/** Russian plural: 1 год, 2 года, 5 лет. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
