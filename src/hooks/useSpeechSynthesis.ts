"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export interface VoiceLike { name: string; lang: string }

/**
 * Voices in order of preference. Matched by substring, case-insensitive, because system voices
 * are named in the OS language ("Саманта" on a Russian macOS). `pitch` is tuned per voice:
 * a real child voice needs only a little lift, adult female voices need the maximum.
 */
const PREFERRED: { match: string[]; pitch: number }[] = [
  { match: ["microsoft ana"], pitch: 1.2 },                       // Edge: a child voice
  { match: ["google us english"], pitch: 1.9 },                   // Chrome
  { match: ["samantha", "саманта"], pitch: 1.9 },                 // macOS, iOS
  { match: ["microsoft jenny", "microsoft aria", "zira"], pitch: 1.9 }, // Windows, Edge
  { match: ["nicky", "никки", "ava", "allison", "susan"], pitch: 1.9 },
];
const DEFAULT_PITCH = 1.9;

/** Adult male and novelty voices that must never play the child. */
const AVOID = [
  "aaron", "alex", "arthur", "daniel", "дэниэл", "david", "eddy", "fred", "фред", "gordon", "grandpa", "grandma",
  "guy", "mark", "ralph", "ральф", "reed", "rocko", "rishi", "риши", "albert", "альберт", "junior", "джуниор",
  "male", "bad news", "плохие", "good news", "хорошие", "bahh", "бах", "bells", "колокольчик", "boing", "прыг",
  "bubbles", "пузырьки", "cellos", "виолончель", "jester", "шутник", "organ", "орган", "superstar", "суперзвезда",
  "trinoids", "триноид", "whisper", "шепот", "wobble", "воббл", "zarvox", "зарвокс", "kathy", "кэти",
];

/** Picks the most child-like English voice and the pitch to use with it. */
export function pickChildVoice<V extends VoiceLike>(voices: readonly V[]): { voice: V | null; pitch: number } {
  const english = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("en"));
  const lower = (v: V) => v.name.toLowerCase();
  for (const { match, pitch } of PREFERRED) {
    const found = english.find((v) => match.some((m) => lower(v).includes(m)));
    if (found) return { voice: found, pitch };
  }
  const safe = english.filter((v) => !AVOID.some((a) => lower(v).includes(a)));
  const us = safe.find((v) => v.lang.toLowerCase().replace("_", "-") === "en-us");
  return { voice: us ?? safe[0] ?? null, pitch: DEFAULT_PITCH };
}

const subscribe = () => () => {};
const isSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export interface UseSpeechSynthesis {
  supported: boolean;
  speaking: boolean;
  speak(text: string): void;
  cancel(): void;
}

export function useSpeechSynthesis(): UseSpeechSynthesis {
  const supported = useSyncExternalStore(subscribe, isSupported, () => false);
  const [speaking, setSpeaking] = useState(false);
  const choice = useRef<{ voice: SpeechSynthesisVoice | null; pitch: number }>({ voice: null, pitch: DEFAULT_PITCH });

  useEffect(() => {
    if (!isSupported()) return;
    const synth = window.speechSynthesis;
    const pick = () => {
      choice.current = pickChildVoice(synth.getVoices());
    };
    pick();
    synth.addEventListener("voiceschanged", pick);
    return () => {
      synth.removeEventListener("voiceschanged", pick);
      synth.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported()) return;
    try {
      const synth = window.speechSynthesis;
      // Some browsers load voices late and never fire voiceschanged: pick again if needed.
      if (!choice.current.voice) choice.current = pickChildVoice(synth.getVoices());
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const { voice, pitch } = choice.current;
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = "en-US";
      }
      u.pitch = pitch;
      u.rate = 1.1;
      u.volume = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    } catch {
      setSpeaking(false);
    }
  }, []);

  const cancel = useCallback(() => {
    try {
      if (isSupported()) window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    setSpeaking(false);
  }, []);

  return { supported, speaking, speak, cancel };
}
