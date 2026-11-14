export type PositiveTag =
  | "name_feeling" | "connect_first" | "offer_choice" | "playful"
  | "when_then" | "calm_limit" | "labeled_praise";
export type NegativeTag =
  | "threat" | "yell_or_insult" | "lecture" | "dismiss_feeling" | "why_question" | "bribe";
export type TechniqueTag = PositiveTag | NegativeTag;

export type MoodBand = "meltdown" | "upset" | "grumpy" | "warming" | "calm";
export type AgeGroup = "toddler" | "preschool" | "school" | "preteen";
export type Temperament = "strong-willed" | "sensitive" | "easygoing";
export type UnderlyingNeed =
  | "autonomy" | "connection" | "transition" | "sensory" | "fairness" | "competence" | "rest";
export type Safety = "none" | "child_at_risk" | "parent_crisis";
export type Difficulty = "normal" | "hard";
export type Outcome = "continue" | "calm_reached" | "turn_limit" | "ended_by_parent";
export type Source = "ai" | "fallback";

export interface PlanPhrase { phrase: string; technique: PositiveTag; }

export interface Scenario {
  id: string;                    // preset id или "custom-<uuid>"
  source: "preset" | "custom";
  title: string;                 // "Brushing teeth at bedtime"
  childName: string;             // учебное имя из списка, не настоящее
  ageYears: number;              // 2..12
  ageGroup: AgeGroup;            // выводится из ageYears (см. 7.3)
  temperament: Temperament;
  trigger: string;               // "refuses to brush teeth"
  setting: string;               // "Bathroom, 7:45 pm, already late for bed"
  underlyingNeed: UnderlyingNeed;
  openingLine: string;           // первая реплика ребёнка
  planPhrases?: PlanPhrase[];    // только у пресетов (запасной план на вечер)
}

export interface TagHit { tag: TechniqueTag; evidence: string; }
export interface AppliedTag extends TagHit { weight: number; applied: number; }

export interface Turn {
  index: number;                 // 0-based
  parentText: string;
  tags: AppliedTag[];
  moodBefore: number;
  moodAfter: number;
  delta: number;                 // moodAfter - moodBefore (фактическое)
  childReply: string;
  source: Source;
}

export interface Rewrite { turnIndex: number; original: string; improved: string; technique: PositiveTag; }

export interface DebriefStats {
  turns: number; startMood: number; endMood: number; peakMood: number; lowMood: number; outcome: Outcome;
}
export interface Debrief {
  summary: string;
  rewrites: Rewrite[];           // 0..3
  tonightPlan: PlanPhrase[];     // ровно 3
  stats: DebriefStats;
  source: Source;
}

export interface Session {
  version: 1;
  id: string;                    // crypto.randomUUID()
  createdAt: string;             // ISO
  scenario: Scenario;
  difficulty: Difficulty;
  startMood: number;
  mood: number;                  // текущее
  turns: Turn[];
  status: "active" | "ended";
  outcome: Outcome;              // "continue" пока активна
  debrief?: Debrief;
}

export interface Profile {
  version: 1;
  childName: string;
  ageYears: number;
  temperament: Temperament;
  coachHints: boolean;           // показывать чипы приёмов во время репетиции
  voiceOn: boolean;              // озвучка ответов ребёнка
}

// ---------- API ----------
export interface HistoryItem { role: "child" | "parent"; text: string; }

export interface TurnRequest {
  scenario: Scenario;
  difficulty: Difficulty;
  mood: number;                  // 0..100, настроение ДО хода
  turnIndex: number;             // 0..7 = session.turns.length
  history: HistoryItem[];        // последние ≤ 16 реплик, первая — openingLine ребёнка
  parentText: string;            // 1..400 символов
  prevTags: TechniqueTag[];      // теги предыдущего хода (для затухания повторов)
}
export interface TurnModelOutput {
  safety: Safety;
  tags: TagHit[];
  replies: { calmer: string; same: string; worse: string };
}
export interface TurnResult { turn: Turn; band: MoodBand; outcome: Outcome; safety: Safety; }

export interface ScenarioRequest {
  text: string;                  // 10..600 символов
  childName: string;
  ageYears: number;
  temperament: Temperament;
}
export type ScenarioResult =
  | { kind: "ok"; scenario: Scenario }
  | { kind: "off_topic" }
  | { kind: "safety"; safety: Exclude<Safety, "none"> };

export interface DebriefRequest {
  scenario: Scenario;
  turns: Turn[];
  outcome: Exclude<Outcome, "continue">;
  startMood: number;
}

export type ApiErrorCode = "BAD_REQUEST" | "RATE_LIMITED" | "INTERNAL";
export type ApiResponse<T> =
  | { ok: true; data: T; meta: { source: Source; latencyMs: number } }
  | { ok: false; error: { code: ApiErrorCode; message: string } };
