import { CALM_THRESHOLD, MAX_TURNS } from "../constants";
import { TECHNIQUE_BY_TAG } from "../data";
import { detectSafety, maxSafety } from "../safety";
import type { Source, TagHit, TechniqueTag, TurnModelOutput, TurnRequest, TurnResult } from "../types";
import { applyTurn, bandIndex, bandOf } from "./mood";
import { evidenceMatches, isShouting, normalizeText, replySeed, sanitizeReply, wordCount } from "./text";

export function postProcessTags(tags: TagHit[], text: string): TagHit[] {
  const seen = new Set<TechniqueTag>();
  const kept: TagHit[] = [];
  for (const { tag, evidence } of tags) {
    if (!Object.hasOwn(TECHNIQUE_BY_TAG, tag) || seen.has(tag)) continue;
    seen.add(tag);
    if (evidenceMatches(text, evidence)) kept.push({ tag, evidence: evidence.slice(0, 200) });
  }
  const evidence = text.slice(0, 200);
  if (isShouting(text) && !kept.some((hit) => hit.tag === "yell_or_insult")) {
    kept.push({ tag: "yell_or_insult", evidence });
  }
  if (wordCount(text) > 45 && !kept.some((hit) => hit.tag === "lecture")) {
    kept.push({ tag: "lecture", evidence });
  }
  return kept.slice(0, 4);
}

export function finalizeTurn(req: TurnRequest, out: TurnModelOutput, source: Source): TurnResult {
  const text = normalizeText(req.parentText);
  const { applied, moodAfter, delta } = applyTurn({
    moodBefore: req.mood, tags: postProcessTags(out.tags, text), prevTags: req.prevTags, difficulty: req.difficulty,
  });
  const band = bandOf(moodAfter);
  const shift = bandIndex(band) - bandIndex(bandOf(req.mood));
  const reply = shift > 0 ? out.replies.calmer : shift < 0 ? out.replies.worse : out.replies.same;
  const childReply = sanitizeReply(reply, req.scenario.ageGroup, band, replySeed(text, req.turnIndex));
  return {
    turn: { index: req.turnIndex, parentText: text, tags: applied, moodBefore: req.mood, moodAfter, delta, childReply, source },
    band,
    outcome: moodAfter >= CALM_THRESHOLD ? "calm_reached" : req.turnIndex + 1 >= MAX_TURNS ? "turn_limit" : "continue",
    safety: maxSafety(detectSafety(text), out.safety),
  };
}
