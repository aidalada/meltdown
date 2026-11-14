"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type SpeechError = "not-allowed" | "no-speech" | "network" | "aborted" | "other";

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: SpeechError | null;
  start(): void;
  stop(): void;
}

const subscribe = () => () => {};

function getCtor(): MeltdownSpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const standard = (window as Window & { SpeechRecognition?: MeltdownSpeechRecognitionCtor }).SpeechRecognition;
  return standard ?? window.webkitSpeechRecognition;
}

function toError(code: string): SpeechError {
  if (code === "not-allowed" || code === "service-not-allowed") return "not-allowed";
  if (code === "no-speech" || code === "network" || code === "aborted") return code;
  return "other";
}

/** Tap to talk, tap again to stop (SPEC 12.1). Final text goes to onFinal; nothing is sent automatically. */
export function useSpeechRecognition(onFinal: (text: string) => void): UseSpeechRecognition {
  const supported = useSyncExternalStore(subscribe, () => getCtor() !== undefined, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<SpeechError | null>(null);
  const rec = useRef<MeltdownSpeechRecognition | null>(null);
  const finalRef = useRef(onFinal);

  useEffect(() => {
    finalRef.current = onFinal;
  });

  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("not-allowed");
      return;
    }
    if (rec.current) return;
    try {
      const r = new Ctor();
      r.lang = "en-US";
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 1;
      r.onresult = (event) => {
        let live = "";
        let done = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) done += result[0].transcript;
          else live += result[0].transcript;
        }
        setInterim(live);
        if (done.trim()) finalRef.current(done.trim());
      };
      r.onerror = (event) => setError(toError(event.error));
      r.onend = () => {
        rec.current = null;
        setListening(false);
        setInterim("");
      };
      rec.current = r;
      setError(null);
      setListening(true);
      r.start();
    } catch {
      rec.current = null;
      setListening(false);
      setError("other");
    }
  }, []);

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  return { supported, listening, interim, error, start, stop };
}
