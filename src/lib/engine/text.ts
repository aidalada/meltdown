import { FALLBACK_LINES } from "../data";
import type { AgeGroup, MoodBand } from "../types";

export function normalizeText(text: string): string {
  return text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

function words(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? [];
}

export function wordCount(text: string): number {
  return words(text).length;
}

export function isShouting(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  const upper = text.match(/\p{Lu}/gu) ?? [];
  return letters.length >= 8 && upper.length >= 0.7 * letters.length && wordCount(text) >= 3;
}

export function evidenceMatches(text: string, evidence: string): boolean {
  const source = new Set(words(normalizeText(text).toLowerCase()));
  const cited = words(normalizeText(evidence).toLowerCase());
  return cited.length > 0 && cited.filter((word) => source.has(word)).length >= 0.6 * cited.length;
}

export function replySeed(text: string, turnIndex: number): number {
  const normalized = normalizeText(text);
  let seed = turnIndex;
  for (let i = 0; i < normalized.length; i++) seed += normalized.charCodeAt(i);
  return seed;
}

export function pickFallbackLine(ageGroup: AgeGroup, band: MoodBand, seed: number): string {
  return FALLBACK_LINES[ageGroup][band][seed % 5];
}

function unquote(text: string): string {
  return text.replace(/^(["'])(.*)\1$/, "$2").trim();
}

export function sanitizeReply(reply: string, ageGroup: AgeGroup, band: MoodBand, seed: number): string {
  const text = unquote(normalizeText(reply));
  let line = unquote(text.replace(/^[\p{L}][\p{L}'-]*:\s*/u, ""));
  if (!line || /\b(ai|artificial intelligence|language model|chatbot|assistant|simulation)\b|\ba\.i\.(?!\w)/i.test(line)) {
    line = pickFallbackLine(ageGroup, band, seed);
  }
  const limit = ageGroup === "toddler" || ageGroup === "preschool" ? 14 : 24;
  const tokens = line.split(/\s+/);
  return tokens.length > limit ? tokens.slice(0, limit).join(" ") + "…" : line;
}
