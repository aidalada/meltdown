import { choiceOf, type AgeChoice } from "@/lib/age";
import type { PositiveTag, Temperament } from "@/lib/types";

/*
 * SOS cheat sheet: three things to say right now, picked for the child's age and temperament.
 *   1. connect   — depends on temperament (what this child needs to hear first) and age tier
 *   2. a choice  — depends on age (what a child of that age can actually choose)
 *   3. the limit — depends on age (how firm and how short)
 * The parent says them to an English-speaking child, so `phrase` is English; `ru` is a gloss shown
 * under it in the Russian interface. Each phrase names one of our techniques (techniques.json).
 * Wording belongs to C (Rulan); the structure belongs to A.
 */
export interface SosPhrase { phrase: string; ru: string; technique: PositiveTag }

type Tier = "little" | "kid" | "teen";
const TIER: Record<AgeChoice, Tier> = { toddler: "little", preschool: "little", school: "kid", preteen: "kid", teen: "teen" };

const CONNECT: Record<Temperament, Record<Tier, SosPhrase>> = {
  "strong-willed": {
    little: { phrase: "You really wanted that. I hear you.", ru: "Ты очень этого хотел. Я тебя слышу.", technique: "name_feeling" },
    kid: { phrase: "You wanted to decide this yourself. I get it.", ru: "Ты хотел решить это сам. Я понимаю.", technique: "name_feeling" },
    teen: { phrase: "I hear you. You wanted a say in this.", ru: "Я тебя слышу. Ты хотел, чтобы с тобой считались.", technique: "name_feeling" },
  },
  sensitive: {
    little: { phrase: "I'm right here. You're safe.", ru: "Я рядом. Ты в безопасности.", technique: "connect_first" },
    kid: { phrase: "I'm here. This feels really big right now.", ru: "Я рядом. Сейчас это кажется огромным.", technique: "connect_first" },
    teen: { phrase: "I'm not mad. I'm here when you're ready.", ru: "Я не злюсь. Я рядом, когда будешь готов.", technique: "connect_first" },
  },
  easygoing: {
    little: { phrase: "That was hard, huh?", ru: "Тяжело было, да?", technique: "name_feeling" },
    kid: { phrase: "Rough moment. I'm with you.", ru: "Тяжёлый момент. Я с тобой.", technique: "connect_first" },
    teen: { phrase: "Rough day? I'm listening.", ru: "Тяжёлый день? Я слушаю.", technique: "connect_first" },
  },
};

const CHOICE: Record<AgeChoice, SosPhrase> = {
  toddler: { phrase: "Do you want to walk, or should I carry you?", ru: "Пойдёшь сам или тебя понести?", technique: "offer_choice" },
  preschool: { phrase: "Do you want to hop there or tiptoe?", ru: "Допрыгаешь туда или пойдёшь на цыпочках?", technique: "offer_choice" },
  school: { phrase: "Do you want to start now or in two minutes?", ru: "Начнёшь сейчас или через две минуты?", technique: "offer_choice" },
  preteen: { phrase: "Your call: now, or after a five-minute break?", ru: "Решай сам: сейчас или после пяти минут перерыва?", technique: "offer_choice" },
  teen: { phrase: "What works for you: now, or in ten minutes?", ru: "Как тебе удобнее: сейчас или через десять минут?", technique: "offer_choice" },
};

const LIMIT: Record<AgeChoice, SosPhrase> = {
  toddler: { phrase: "I won't let you hit. I'll stay close.", ru: "Я не дам тебе бить. Я буду рядом.", technique: "calm_limit" },
  preschool: { phrase: "When we're calm, then we'll fix it together.", ru: "Когда успокоимся, тогда вместе всё исправим.", technique: "when_then" },
  school: { phrase: "When you're ready, then we'll solve this together.", ru: "Когда будешь готов, тогда решим это вместе.", technique: "when_then" },
  preteen: { phrase: "I won't argue right now. When we're both calm, we'll talk.", ru: "Я не буду сейчас спорить. Когда оба успокоимся, поговорим.", technique: "calm_limit" },
  teen: { phrase: "Let's pause. When we're both calm, we'll sort it out.", ru: "Давай сделаем паузу. Когда оба успокоимся, разберёмся.", technique: "when_then" },
};

/** The three phrases for this child, in the order to say them. */
export function sosPhrases(ageYears: number, temperament: Temperament): SosPhrase[] {
  const age = choiceOf(ageYears);
  return [CONNECT[temperament][TIER[age]], CHOICE[age], LIMIT[age]];
}
