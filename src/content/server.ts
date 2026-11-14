import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale, textsFor, type Locale, type Texts } from "./locale";

/** The interface language for this request (server components). */
export async function getLocale(): Promise<Locale> {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getTexts(): Promise<Texts> {
  return textsFor(await getLocale());
}
