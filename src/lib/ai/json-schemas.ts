import { PRESETS } from "../data";

export const TECHNIQUE_TAGS = [
  "name_feeling", "connect_first", "offer_choice", "playful", "when_then", "calm_limit", "labeled_praise",
  "threat", "yell_or_insult", "lecture", "dismiss_feeling", "why_question", "bribe",
] as const;
export const POSITIVE_TAGS = [
  "name_feeling", "connect_first", "offer_choice", "playful", "when_then", "calm_limit", "labeled_praise",
] as const;

export const TURN_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    safety: { type: "string", enum: ["none", "child_at_risk", "parent_crisis"] },
    tags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tag: { type: "string", enum: [...TECHNIQUE_TAGS] },
          evidence: { type: "string" },
        },
        required: ["tag", "evidence"],
        additionalProperties: false,
      },
    },
    replies: {
      type: "object",
      properties: {
        calmer: { type: "string" },
        same: { type: "string" },
        worse: { type: "string" },
      },
      required: ["calmer", "same", "worse"],
      additionalProperties: false,
    },
  },
  required: ["safety", "tags", "replies"],
  additionalProperties: false,
} as const;

export const SCENARIO_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    on_topic: { type: "boolean" },
    safety: TURN_OUTPUT_JSON_SCHEMA.properties.safety,
    title: { type: "string" },
    trigger: { type: "string" },
    setting: { type: "string" },
    underlying_need: {
      type: "string",
      enum: ["autonomy", "connection", "transition", "sensory", "fairness", "competence", "rest"],
    },
    opening_line: { type: "string" },
  },
  required: ["on_topic", "safety", "title", "trigger", "setting", "underlying_need", "opening_line"],
  additionalProperties: false,
} as const;

export const DEBRIEF_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    rewrites: {
      type: "array",
      items: {
        type: "object",
        properties: {
          turn_index: { type: "integer" },
          improved: { type: "string" },
          technique: { type: "string", enum: [...POSITIVE_TAGS] },
        },
        required: ["turn_index", "improved", "technique"],
        additionalProperties: false,
      },
    },
    tonight_plan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phrase: { type: "string" },
          technique: { type: "string", enum: [...POSITIVE_TAGS] },
        },
        required: ["phrase", "technique"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "rewrites", "tonight_plan"],
  additionalProperties: false,
} as const;

/** Sebastian's reply. `say` is "" and `preset` is "none" when there is nothing to add. */
export const COACH_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    safety: TURN_OUTPUT_JSON_SCHEMA.properties.safety,
    lead: { type: "string" },
    technique: { type: "string", enum: [...POSITIVE_TAGS] },
    say: { type: "string" },
    preset: { type: "string", enum: [...PRESETS.map((preset) => preset.id), "none"] },
  },
  required: ["safety", "lead", "technique", "say", "preset"],
  additionalProperties: false,
} as const;
