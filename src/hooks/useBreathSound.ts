"use client";

import { useEffect, useRef, useState } from "react";

/** One breath of the wave: 4 s in, 6 s out. */
const IN_S = 4;
const CYCLE_S = 10;
/** Loudness and brightness of the wave at its lowest point (between breaths) and at the top of the inhale. */
const QUIET = { gain: 0.08, cutoff: 420 };
const FULL = { gain: 0.55, cutoff: 1500 };

/**
 * A few seconds of pink noise, the hiss of surf or steady rain. Tones (the first version) sounded
 * like an alarm; noise has no pitch, so there is nothing to sound "wrong". The end of the buffer is
 * cross-faded into its start, so the loop has no click.
 */
export function pinkNoise(ctx: BaseAudioContext, seconds = 6): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const fade = Math.floor(ctx.sampleRate * 0.25);
  const raw = new Float32Array(length + fade);
  // Paul Kellet's pink-noise filter: white noise through six leaky integrators.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < raw.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const out = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const k = i / fade;
    out[i] = i < fade ? raw[i] * k + raw[length + i] * (1 - k) : raw[i];
  }
  return buffer;
}

/**
 * Schedules one breath on the wave: it swells and brightens while you breathe in (the wave comes
 * in), then falls away for the longer breath out. It never drops to silence, so it reads as the sea.
 */
export function scheduleBreath(gain: AudioParam, cutoff: AudioParam, t: number, fadeIn: boolean) {
  gain.cancelScheduledValues(t);
  cutoff.cancelScheduledValues(t);
  gain.setValueAtTime(fadeIn ? 0.0001 : QUIET.gain, t);
  cutoff.setValueAtTime(QUIET.cutoff, t);
  gain.linearRampToValueAtTime(FULL.gain, t + IN_S);
  cutoff.exponentialRampToValueAtTime(FULL.cutoff, t + IN_S);
  gain.linearRampToValueAtTime(QUIET.gain, t + CYCLE_S);
  cutoff.exponentialRampToValueAtTime(QUIET.cutoff, t + CYCLE_S);
}

function vibrate(pattern: number[]) {
  // Android Chrome only; iPhone Safari has no vibration API.
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

/**
 * The SOS wave sound, generated in the browser (no audio files, nothing to license). Off until the
 * parent turns it on, which is also what browsers require before any sound can play.
 */
export function useBreathSound() {
  const audio = useRef<{ ctx: AudioContext; gain: GainNode; filter: BiquadFilterNode } | null>(null);
  const timer = useRef<number | null>(null);
  const [on, setOn] = useState(false);

  function graph() {
    if (audio.current) return audio.current;
    const ctx = new AudioContext();
    const source = ctx.createBufferSource();
    source.buffer = pinkNoise(ctx);
    source.loop = true;
    const rumble = ctx.createBiquadFilter();   // phone speakers only distort below this
    rumble.type = "highpass";
    rumble.frequency.value = 120;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.4;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(rumble).connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    audio.current = { ctx, gain, filter };
    return audio.current;
  }

  function breath(fadeIn: boolean) {
    const a = audio.current;
    if (!a) return;
    scheduleBreath(a.gain.gain, a.filter.frequency, a.ctx.currentTime + 0.05, fadeIn);
    vibrate([30]);
    window.setTimeout(() => vibrate([15, 90, 15]), IN_S * 1000);
  }

  function stop() {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    const a = audio.current;
    if (a) {
      a.gain.gain.cancelScheduledValues(a.ctx.currentTime);
      a.gain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.15);
      window.setTimeout(() => { if (timer.current === null) void a.ctx.suspend(); }, 700);
    }
    setOn(false);
  }

  function start() {
    void graph().ctx.resume();
    breath(true);
    timer.current = window.setInterval(() => breath(false), CYCLE_S * 1000);
    setOn(true);
  }

  useEffect(() => () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    void audio.current?.ctx.close();
  }, []);

  return { on, toggle: () => (on ? stop() : start()) };
}
