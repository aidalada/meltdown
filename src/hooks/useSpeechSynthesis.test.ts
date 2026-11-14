import { describe, expect, it } from "vitest";
import { pickChildVoice, type VoiceLike } from "./useSpeechSynthesis";

const v = (name: string, lang = "en-US"): VoiceLike => ({ name, lang });

describe("pickChildVoice", () => {
  it("finds Samantha on a Russian macOS instead of the first (male) voice", () => {
    const voices = [v("Aaron"), v("Эдди", "en-US"), v("Джуниор"), v("Ральф"), v("Саманта"), v("Фред")];
    expect(pickChildVoice(voices).voice?.name).toBe("Саманта");
  });

  it("prefers Google US English in Chrome", () => {
    const voices = [v("Aaron"), v("Samantha"), v("Google US English"), v("Google UK English Male", "en-GB")];
    expect(pickChildVoice(voices)).toEqual({ voice: v("Google US English"), pitch: 1.9 });
  });

  it("uses the Edge child voice with a small pitch lift", () => {
    const voices = [v("Microsoft Guy Online (Natural) - English (United States)"), v("Microsoft Ana Online (Natural) - English (United States)")];
    const picked = pickChildVoice(voices);
    expect(picked.voice?.name).toContain("Ana");
    expect(picked.pitch).toBe(1.2);
  });

  it("skips male and novelty voices in the fallback", () => {
    const voices = [v("Aaron"), v("Bubbles"), v("Grandpa"), v("Shelley (English (US))"), v("Fred")];
    expect(pickChildVoice(voices).voice?.name).toBe("Shelley (English (US))");
  });

  it("ignores non-English voices and returns null when nothing fits", () => {
    expect(pickChildVoice([v("Милена", "ru-RU"), v("Aaron")]).voice).toBeNull();
    expect(pickChildVoice([]).voice).toBeNull();
  });

  it("accepts Android-style language codes", () => {
    expect(pickChildVoice([v("English United States", "en_US")]).voice?.name).toBe("English United States");
  });
});
