import type { Temperament } from "./types";

export const MAX_TURNS = 8;
export const CALM_THRESHOLD = 80;            // успех при moodAfter >= 80
export const MAX_PARENT_TEXT = 400;
export const MAX_SCENARIO_TEXT = 600;
export const MAX_HISTORY_ITEMS = 16;
export const START_MOOD: Record<Temperament, number> = {
  "strong-willed": 30, sensitive: 35, easygoing: 45,
};
export const HARD_START_OFFSET = -10;        // P1: режим "hard"
export const NO_TAG_DELTA = -2;
export const MAX_UP = 15;
export const MAX_DOWN = -25;
export const LOW_MOOD_THRESHOLD = 30;        // ниже — позитив работает вдвое слабее
export const LOW_MOOD_POSITIVE_MULT = 0.5;
export const REPEAT_POSITIVE_MULT = 0.5;     // тот же позитивный приём два хода подряд
export const HARD_POSITIVE_MULT = 0.8;
export const SESSIONS_KEEP = 20;
export const TRIAL_DAYS = 30;
