import { ageGroupOf } from "./data";
import type { AgeGroup } from "./types";

/*
 * Parents pick an age range instead of an exact number. The four ranges are the engine's own age
 * groups (ageGroupOf), so the child's lines and the avatar follow the choice. The API accepts
 * ages 2 to 12 (schemas.ts), so 9–12 is the oldest range until the backend supports teens.
 */
export const AGE_OPTIONS: readonly { group: AgeGroup; range: string; years: number }[] = [
  { group: "toddler", range: "2–3", years: 3 },
  { group: "preschool", range: "4–5", years: 4 },
  { group: "school", range: "6–8", years: 7 },
  { group: "preteen", range: "9–12", years: 10 },
];

/** The age to store for a range: keep the current age when it is already inside that range. */
export function yearsForGroup(group: AgeGroup, currentYears: number): number {
  if (ageGroupOf(currentYears) === group) return currentYears;
  return AGE_OPTIONS.find((o) => o.group === group)?.years ?? currentYears;
}

export function rangeOf(group: AgeGroup): string {
  return AGE_OPTIONS.find((o) => o.group === group)?.range ?? "";
}
