import { describe, expect, it } from "vitest";
import { AGE_OPTIONS } from "@/lib/age";
import { TECHNIQUE_BY_TAG } from "@/lib/data";
import { heuristicTags } from "@/lib/engine/heuristics";
import type { Temperament } from "@/lib/types";
import { sosPhrases } from "./sos-phrases";

const TEMPERAMENTS: Temperament[] = ["strong-willed", "sensitive", "easygoing"];

describe("sosPhrases", () => {
  it("gives three short, different phrases for every age and temperament", () => {
    for (const { years } of AGE_OPTIONS) {
      for (const temperament of TEMPERAMENTS) {
        const phrases = sosPhrases(years, temperament);
        expect(phrases).toHaveLength(3);
        expect(new Set(phrases.map((p) => p.phrase)).size).toBe(3);
        for (const p of phrases) {
          expect(p.phrase.length).toBeLessThanOrEqual(64);          // readable at arm's length
          expect(p.ru.length).toBeGreaterThan(0);
          expect(TECHNIQUE_BY_TAG[p.technique].polarity).toBe("positive");
        }
      }
    }
  });

  it("changes with age and with temperament", () => {
    const toddler = sosPhrases(3, "sensitive").map((p) => p.phrase);
    const teen = sosPhrases(12, "sensitive").map((p) => p.phrase);
    const strongWilled = sosPhrases(3, "strong-willed").map((p) => p.phrase);
    expect(teen).not.toEqual(toddler);
    expect(strongWilled[0]).not.toBe(toddler[0]);
    expect(strongWilled.slice(1)).toEqual(toddler.slice(1));   // the choice and the limit follow age
  });

  it("never tells the parent to say something the engine scores as harmful", () => {
    for (const { years } of AGE_OPTIONS) {
      for (const temperament of TEMPERAMENTS) {
        for (const p of sosPhrases(years, temperament)) {
          const harmful = heuristicTags(p.phrase).filter((hit) => TECHNIQUE_BY_TAG[hit.tag].polarity === "negative");
          expect(harmful, p.phrase).toEqual([]);
        }
      }
    }
  });
});
