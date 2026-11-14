import { ageGroupOf } from "./data";
import type { AgeGroup } from "./types";

/*
 * Parents pick an age range instead of an exact number. The first four ranges are the engine's own
 * age groups (ageGroupOf), so the child's lines and the avatar follow the choice. "12+" is the
 * texting mode: the rehearsal looks like a messenger instead of a face-to-face scene.
 * The API accepts ages 2 to 12 (schemas.ts), so a teen is stored as 12 until the backend goes higher.
 */
export type AgeChoice = AgeGroup | "teen";

/** From this age the rehearsal is a text chat (no 2D avatar). */
export const TEXTING_AGE = 12;

export const AGE_OPTIONS: readonly { id: AgeChoice; range: string; years: number }[] = [
  { id: "toddler", range: "2–3", years: 3 },
  { id: "preschool", range: "4–5", years: 4 },
  { id: "school", range: "6–8", years: 7 },
  { id: "preteen", range: "9–11", years: 10 },
  { id: "teen", range: "12+", years: TEXTING_AGE },
];

export function isTexting(years: number): boolean {
  return years >= TEXTING_AGE;
}

export function choiceOf(years: number): AgeChoice {
  return isTexting(years) ? "teen" : ageGroupOf(years);
}

/** The age to store for a range: keep the current age when it is already inside that range. */
export function yearsForChoice(choice: AgeChoice, currentYears: number): number {
  if (choiceOf(currentYears) === choice) return currentYears;
  return AGE_OPTIONS.find((o) => o.id === choice)?.years ?? currentYears;
}

export function rangeOf(choice: AgeChoice): string {
  return AGE_OPTIONS.find((o) => o.id === choice)?.range ?? "";
}
