import { ageGroupOf } from "../data";
import { detectSafety, maxSafety } from "../safety";
import type { ScenarioModelOutput } from "../schemas";
import type { ScenarioRequest, ScenarioResult } from "../types";
import { replySeed, sanitizeReply } from "./text";

export function finalizeScenario(req: ScenarioRequest, out: ScenarioModelOutput): ScenarioResult {
  const safety = maxSafety(detectSafety(req.text), out.safety);
  if (safety !== "none") return { kind: "safety", safety };
  if (!out.on_topic) return { kind: "off_topic" };
  const ageGroup = ageGroupOf(req.ageYears);
  return {
    kind: "ok",
    scenario: {
      id: "custom-" + crypto.randomUUID(),
      source: "custom",
      title: out.title.slice(0, 48),
      trigger: out.trigger.slice(0, 80),
      setting: out.setting.slice(0, 100),
      underlyingNeed: out.underlying_need,
      openingLine: sanitizeReply(out.opening_line, ageGroup, "upset", replySeed(req.text, 0)),
      childName: req.childName,
      ageYears: req.ageYears,
      ageGroup,
      temperament: req.temperament,
    },
  };
}
