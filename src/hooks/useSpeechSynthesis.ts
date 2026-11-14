"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const PREFERRED = ["Google US English", "Samantha", "Microsoft Aria Online (Natural) - English (United States)"];
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
  const voice = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!isSupported()) return;
    const synth = window.speechSynthesis;
    const pick = () => {
      const voices = synth.getVoices();
      voice.current = PREFERRED.map((name) => voices.find((v) => v.name === name)).find((v) => v !== undefined)
        ?? voices.find((v) => v.lang === "en-US") ?? null;
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
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice.current) u.voice = voice.current;
      u.lang = "en-US";
      u.pitch = 1.6;
      u.rate = 1.05;
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
