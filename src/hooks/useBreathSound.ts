"use client";

import { useEffect, useRef, useState } from "react";

/** One breath, matching the SOS circle (globals.css `breathe`): 4 s in, 6 s out. */
const IN_S = 4;
const CYCLE_S = 10;

function vibrate(pattern: number[]) {
  // Android Chrome only; iPhone Safari has no vibration API.
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

/**
 * A soft breathing tone, generated in the browser (no audio files): the pitch rises while you breathe
 * in and falls while you breathe out, quiet enough to sit under a crying child. Off until the parent
 * turns it on, which is also what browsers require before any sound can play.
 */
export function useBreathSound() {
  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef<number | null>(null);
  const [on, setOn] = useState(false);

  function breath() {
    const audio = ctx.current;
    if (!audio) return;
    const t = audio.currentTime;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 1.2);
    gain.gain.setValueAtTime(0.05, t + IN_S - 0.4);
    gain.gain.exponentialRampToValueAtTime(0.03, t + IN_S + 1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + CYCLE_S - 0.2);
    gain.connect(filter).connect(audio.destination);
    // A root and a soft fifth above it: warmer than a single beep.
    for (const [ratio, level] of [[1, 1], [1.5, 0.35]] as const) {
      const osc = audio.createOscillator();
      const voice = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(196 * ratio, t);
      osc.frequency.linearRampToValueAtTime(262 * ratio, t + IN_S);
      osc.frequency.linearRampToValueAtTime(174 * ratio, t + CYCLE_S);
      voice.gain.value = level;
      osc.connect(voice).connect(gain);
      osc.start(t);
      osc.stop(t + CYCLE_S);
    }
    vibrate([40]);
    window.setTimeout(() => vibrate([20, 80, 20]), IN_S * 1000);
  }

  function stop() {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    void ctx.current?.suspend();
    setOn(false);
  }

  function start() {
    ctx.current ??= new AudioContext();
    void ctx.current.resume();
    breath();
    timer.current = window.setInterval(breath, CYCLE_S * 1000);
    setOn(true);
  }

  useEffect(() => () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    void ctx.current?.close();
  }, []);

  return { on, toggle: () => (on ? stop() : start()) };
}
