import { describe, expect, it } from "vitest";
import { nextSosPick, SOS_COUNTS, SOS_STATES, sosText } from "./sos-coach";

describe("SOS lines", () => {
  it("has ten lines per state and the same counts in both languages", () => {
    expect(SOS_COUNTS.en).toEqual(SOS_COUNTS.ru);
    expect(SOS_COUNTS.en.panic).toBe(10);
    expect(SOS_COUNTS.en.angry).toBe(10);
  });

  it("never shows the same line or ending twice in a row", () => {
    const sameRandom = () => 0.31;
    const first = nextSosPick("panic", null, sameRandom);
    const second = nextSosPick("panic", first, sameRandom);
    expect(second.line).not.toBe(first.line);
    expect(second.ending).not.toBe(first.ending);
  });

  it("gives a line and an invitation to talk later in each language", () => {
    for (const state of SOS_STATES) {
      for (const locale of ["en", "ru"] as const) {
        const { line, ending } = sosText(locale, state, { line: 9, ending: 5 });
        expect(line.length).toBeGreaterThan(20);
        expect(ending.length).toBeGreaterThan(20);
      }
    }
  });
});
