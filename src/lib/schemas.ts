import { z } from "zod";
import { MAX_HISTORY_ITEMS, MAX_PARENT_TEXT, MAX_SCENARIO_TEXT, MAX_TURNS } from "./constants";
import type {
  AgeGroup, ApiErrorCode, ApiResponse, AppliedTag, Debrief, DebriefRequest, DebriefStats,
  Difficulty, HistoryItem, MoodBand, NegativeTag, Outcome, PlanPhrase, PositiveTag, Profile,
  Rewrite, Safety, Scenario, ScenarioRequest, ScenarioResult, Session, Source, TagHit,
  TechniqueTag, Temperament, Turn, TurnModelOutput, TurnRequest, TurnResult, UnderlyingNeed,
} from "./types";

export const PositiveTagSchema = z.enum([
  "name_feeling", "connect_first", "offer_choice", "playful", "when_then", "calm_limit", "labeled_praise",
]) satisfies z.ZodType<PositiveTag>;
export const NegativeTagSchema = z.enum([
  "threat", "yell_or_insult", "lecture", "dismiss_feeling", "why_question", "bribe",
]) satisfies z.ZodType<NegativeTag>;
export const TechniqueTagSchema = z.enum([
  ...PositiveTagSchema.options, ...NegativeTagSchema.options,
]) satisfies z.ZodType<TechniqueTag>;

export const MoodBandSchema = z.enum(["meltdown", "upset", "grumpy", "warming", "calm"]) satisfies z.ZodType<MoodBand>;
export const AgeGroupSchema = z.enum(["toddler", "preschool", "school", "preteen"]) satisfies z.ZodType<AgeGroup>;
export const TemperamentSchema = z.enum(["strong-willed", "sensitive", "easygoing"]) satisfies z.ZodType<Temperament>;
export const UnderlyingNeedSchema = z.enum([
  "autonomy", "connection", "transition", "sensory", "fairness", "competence", "rest",
]) satisfies z.ZodType<UnderlyingNeed>;
export const SafetySchema = z.enum(["none", "child_at_risk", "parent_crisis"]) satisfies z.ZodType<Safety>;
export const DifficultySchema = z.enum(["normal", "hard"]) satisfies z.ZodType<Difficulty>;
export const OutcomeSchema = z.enum([
  "continue", "calm_reached", "turn_limit", "ended_by_parent",
]) satisfies z.ZodType<Outcome>;
export const SourceSchema = z.enum(["ai", "fallback"]) satisfies z.ZodType<Source>;
export const ApiErrorCodeSchema = z.enum(["BAD_REQUEST", "RATE_LIMITED", "INTERNAL"]) satisfies z.ZodType<ApiErrorCode>;

const ageYears = z.int().min(2).max(12);
const mood = z.int().min(0).max(100);
const turnIndex = z.int().min(0).max(MAX_TURNS - 1);
const parentText = z.string().trim().min(1).max(MAX_PARENT_TEXT);
const scenarioText = z.string().min(10).max(MAX_SCENARIO_TEXT);
const modelReply = z.string().max(300);

export const PlanPhraseSchema = z.object({
  phrase: z.string(),
  technique: PositiveTagSchema,
}) satisfies z.ZodType<PlanPhrase>;

export const ScenarioSchema = z.object({
  id: z.string(),
  source: z.enum(["preset", "custom"]),
  title: z.string(),
  childName: z.string(),
  ageYears,
  ageGroup: AgeGroupSchema,
  temperament: TemperamentSchema,
  trigger: z.string(),
  setting: z.string(),
  underlyingNeed: UnderlyingNeedSchema,
  openingLine: z.string(),
  planPhrases: z.array(PlanPhraseSchema).optional(),
}) satisfies z.ZodType<Scenario>;

export const TagHitSchema = z.object({
  tag: TechniqueTagSchema,
  evidence: z.string().max(200),
}) satisfies z.ZodType<TagHit>;

export const AppliedTagSchema = TagHitSchema.extend({
  weight: z.number(),
  applied: z.number(),
}) satisfies z.ZodType<AppliedTag>;

export const TurnSchema = z.object({
  index: turnIndex,
  parentText,
  tags: z.array(AppliedTagSchema),
  moodBefore: mood,
  moodAfter: mood,
  delta: z.number(),
  childReply: z.string(),
  source: SourceSchema,
}) satisfies z.ZodType<Turn>;

export const RewriteSchema = z.object({
  turnIndex,
  original: z.string(),
  improved: z.string(),
  technique: PositiveTagSchema,
}) satisfies z.ZodType<Rewrite>;

export const DebriefStatsSchema = z.object({
  turns: z.int().min(0).max(MAX_TURNS),
  startMood: mood,
  endMood: mood,
  peakMood: mood,
  lowMood: mood,
  outcome: OutcomeSchema,
}) satisfies z.ZodType<DebriefStats>;

export const DebriefSchema = z.object({
  summary: z.string(),
  rewrites: z.array(RewriteSchema).max(3),
  tonightPlan: z.array(PlanPhraseSchema).length(3),
  stats: DebriefStatsSchema,
  source: SourceSchema,
}) satisfies z.ZodType<Debrief>;

export const SessionSchema = z.object({
  version: z.literal(1),
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  scenario: ScenarioSchema,
  difficulty: DifficultySchema,
  startMood: mood,
  mood,
  turns: z.array(TurnSchema).max(MAX_TURNS),
  status: z.enum(["active", "ended"]),
  outcome: OutcomeSchema,
  debrief: DebriefSchema.optional(),
}) satisfies z.ZodType<Session>;

export const ProfileSchema = z.object({
  version: z.literal(1),
  childName: z.string(),
  ageYears,
  temperament: TemperamentSchema,
  coachHints: z.boolean(),
  voiceOn: z.boolean(),
}) satisfies z.ZodType<Profile>;

export const HistoryItemSchema = z.object({
  role: z.enum(["child", "parent"]),
  text: z.string().max(MAX_PARENT_TEXT),
}) satisfies z.ZodType<HistoryItem>;

export const TurnRequestSchema = z.object({
  scenario: ScenarioSchema,
  difficulty: DifficultySchema,
  mood,
  turnIndex,
  history: z.array(HistoryItemSchema).max(MAX_HISTORY_ITEMS),
  parentText,
  prevTags: z.array(TechniqueTagSchema).max(4),
}) satisfies z.ZodType<TurnRequest>;

export const TurnModelOutputSchema = z.object({
  safety: SafetySchema,
  tags: z.array(TagHitSchema).max(8),
  replies: z.object({ calmer: modelReply, same: modelReply, worse: modelReply }),
}) satisfies z.ZodType<TurnModelOutput>;

export const TurnResultSchema = z.object({
  turn: TurnSchema,
  band: MoodBandSchema,
  outcome: OutcomeSchema,
  safety: SafetySchema,
}) satisfies z.ZodType<TurnResult>;

export const ScenarioRequestSchema = z.object({
  text: scenarioText,
  childName: z.string(),
  ageYears,
  temperament: TemperamentSchema,
}) satisfies z.ZodType<ScenarioRequest>;

const offTopic = z.object({ kind: z.literal("off_topic") });
const safetyResult = z.object({ kind: z.literal("safety"), safety: SafetySchema.exclude(["none"]) });
export const ScenarioResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ok"), scenario: ScenarioSchema }),
  offTopic,
  safetyResult,
]) satisfies z.ZodType<ScenarioResult>;

export const DebriefRequestSchema = z.object({
  scenario: ScenarioSchema,
  turns: z.array(TurnSchema).max(MAX_TURNS),
  outcome: OutcomeSchema.exclude(["continue"]),
  startMood: mood,
}) satisfies z.ZodType<DebriefRequest>;

export function ApiResponseSchema<T>(data: z.ZodType<T>): z.ZodType<ApiResponse<T>> {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data, meta: z.object({ source: SourceSchema, latencyMs: z.number() }) }),
    z.object({ ok: z.literal(false), error: z.object({ code: ApiErrorCodeSchema, message: z.string() }) }),
  ]);
}

const techniqueFields = {
  weight: z.int(),
  label: z.string(),
  shortTip: z.string(),
  why: z.string(),
  source: z.object({ name: z.string(), url: z.url() }),
  patterns: z.array(z.string()),
};
export const TechniqueSchema = z.discriminatedUnion("polarity", [
  z.object({
    ...techniqueFields,
    polarity: z.literal("positive"),
    tag: PositiveTagSchema,
    goodExample: z.string(),
    betterWith: z.array(PositiveTagSchema).length(0),
  }),
  z.object({
    ...techniqueFields,
    polarity: z.literal("negative"),
    tag: NegativeTagSchema,
    goodExample: z.null(),
    betterWith: z.array(PositiveTagSchema),
  }),
]);
export type Technique = z.infer<typeof TechniqueSchema>;

export const TechniquesFileSchema = z.object({
  version: z.literal(1),
  techniques: z.array(TechniqueSchema),
});
export type TechniquesFile = z.infer<typeof TechniquesFileSchema>;

const presetSchema = ScenarioSchema.omit({ ageGroup: true }).extend({
  source: z.literal("preset"),
  priority: z.enum(["P0", "P1"]),
  planPhrases: z.array(PlanPhraseSchema),
});
export type Preset = z.infer<typeof presetSchema>;
export const ScenariosFileSchema = z.object({
  version: z.literal(1),
  childNames: z.array(z.string()),
  scenarios: z.array(presetSchema),
});
export type ScenariosFile = z.infer<typeof ScenariosFileSchema>;

export const FallbackLinesFileSchema = z.object({
  version: z.literal(1),
  lines: z.record(AgeGroupSchema, z.record(MoodBandSchema, z.array(z.string()).length(5))),
});
export type FallbackLinesFile = z.infer<typeof FallbackLinesFileSchema>;

const evalTurnCaseSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  mood,
  parentText,
  expectTags: z.array(TechniqueTagSchema),
  forbidTags: z.array(TechniqueTagSchema),
  replyMustNotMatch: z.string().optional(),
});
export type EvalTurnCase = z.infer<typeof evalTurnCaseSchema>;

const evalScenarioCaseSchema = z.object({
  id: z.string(),
  text: scenarioText,
  ageYears,
  expect: z.discriminatedUnion("kind", [z.object({ kind: z.literal("ok") }), offTopic, safetyResult]),
});
export type EvalScenarioCase = z.infer<typeof evalScenarioCaseSchema>;

export const EvalCasesFileSchema = z.object({
  version: z.literal(1),
  turnCases: z.array(evalTurnCaseSchema),
  scenarioCases: z.array(evalScenarioCaseSchema),
});
export type EvalCasesFile = z.infer<typeof EvalCasesFileSchema>;
