import type { Locale } from "./locale";

/*
 * What Sebastian says on the SOS screen when the parent taps "I'm about to lose it" or "I'm angry".
 * Ten lines per state, picked at random each time, plus an ending that always invites the parent to
 * talk it through in the chat later. Short, calm, about the parent first: no technique names here.
 */
export type SosState = "panic" | "angry";
export const SOS_STATES: readonly SosState[] = ["panic", "angry"];

interface SosTexts { lines: Record<SosState, readonly string[]>; endings: readonly string[] }

const EN: SosTexts = {
  lines: {
    panic: [
      "Stop for one breath. You don't have to fix this in the next ten seconds.",
      "Rest your hands on your knees or the counter. Feel the surface beneath them.",
      "Before you speak, lower your voice. You can start with one short sentence.",
      "If your child is safe, give yourself a little space to take a breath.",
      "Try naming what you feel: \"I'm overwhelmed.\" Then take a moment before you respond.",
      "Unclench your jaw and let your shoulders drop. Take one slow breath.",
      "You don't need the perfect words. If it feels right, sit nearby for a moment.",
      "Look around and name five things you can see. Take your time.",
      "This is a hard moment. For now, focus on one thing you can do calmly.",
      "Breathe in for four, out for six. Do it twice before you speak.",
    ],
    angry: [
      "Being angry doesn't make you a bad parent. What you do next is what counts.",
      "Take three slow breaths before you decide what to say.",
      "If your child is safe and you need a moment, say: \"I need a minute. I'll be right back.\"",
      "Keep your hands still and your voice low. Firm doesn't have to be loud.",
      "Say one short sentence, then stop: \"I won't let you hit. I'm here.\"",
      "Take a sip of water or rest your hands on a cool surface. Give yourself a moment.",
      "Your child may be having a hard time, too. You can wait a moment before you respond.",
      "Open your hands and let them rest. Give yourself a few seconds before you speak.",
      "You can be angry and still choose a calm voice. That's exactly the skill you're building.",
      "It's okay to say, \"I'm angry and I need a moment.\" A pause is something your child can learn from, too.",
    ],
  },
  endings: [
    "Tonight, when things settle, tell me how it went and we'll go through it together.",
    "When you have a quiet moment, message me. We can take it one step at a time.",
    "Later, when you have a minute, write to me in the chat. We'll find what to try next time.",
    "Once the house is quiet, come back and tell me what happened. We'll rehearse it together.",
    "When it's over, let's talk it through in the chat, calmly and in detail.",
    "This evening, let's go over it together in the chat. No rush.",
  ],
};

const RU: SosTexts = {
  lines: {
    panic: [
      "Остановитесь на один вдох. Не нужно решать всё в ближайшие десять секунд.",
      "Положите ладони на колени или на стол. Почувствуйте опору под руками.",
      "Прежде чем говорить, сделайте голос тише. Начните с одной короткой фразы.",
      "Если ребёнок в безопасности, можно немного отступить и выдохнуть.",
      "Попробуйте назвать чувство: «Я на пределе». Дайте себе паузу перед ответом.",
      "Расслабьте челюсть, опустите плечи и сделайте один медленный выдох.",
      "Идеальные слова не нужны. Если сейчас уместно, просто присядьте рядом.",
      "Посмотрите вокруг и назовите пять предметов, которые видите. Не спешите.",
      "Сейчас тяжело. Выберите одно маленькое действие, которое можете сделать спокойно.",
      "Вдох на четыре счёта, выдох на шесть. Дважды, прежде чем что-то сказать.",
    ],
    angry: [
      "Злость не делает вас плохим родителем. Важно то, что вы сделаете дальше.",
      "Сделайте три медленных вдоха, а потом решите, что сказать.",
      "Если ребёнок в безопасности, можно сказать: «Мне нужна минутка. Я сейчас вернусь».",
      "Руки спокойно, голос тихо. Твёрдо не значит громко.",
      "Одна короткая фраза, и всё: «Я не дам тебе драться. Я рядом».",
      "Сделайте глоток воды или положите ладони на прохладную поверхность. Дайте себе паузу.",
      "Возможно, ребёнку сейчас тоже трудно. Можно немного подождать с ответом.",
      "Разожмите ладони и дайте рукам отдохнуть. Подождите несколько секунд, прежде чем говорить.",
      "Можно злиться и всё равно говорить спокойно. Именно этому вы и учитесь.",
      "Можно сказать: «Я злюсь, мне нужна минутка». Так ребёнок увидит, что можно взять паузу.",
    ],
  },
  endings: [
    "Вечером, когда всё уляжется, расскажите мне, как прошло, и разберём вместе.",
    "Когда будет спокойная минутка, напишите мне. Разберём ситуацию по шагам.",
    "Позже, когда будет минутка, напишите мне в чат. Найдём, что попробовать в следующий раз.",
    "Когда дома станет тихо, возвращайтесь и расскажите, что было. Отрепетируем вместе.",
    "Когда всё закончится, давайте спокойно и подробно обсудим это в переписке.",
    "Сегодня вечером давайте разберём это вместе в чате. Без спешки.",
  ],
};

const TEXTS: Record<Locale, SosTexts> = { en: EN, ru: RU };

export interface SosPick { line: number; ending: number }

/** A new line for this state, never the same as the one on screen. `random` is in [0, 1). */
export function nextSosPick(state: SosState, previous: SosPick | null, random: () => number = Math.random): SosPick {
  const count = EN.lines[state].length;
  let line = Math.floor(random() * count);
  if (previous && line === previous.line) line = (line + 1) % count;
  let ending = Math.floor(random() * EN.endings.length);
  if (previous && ending === previous.ending) ending = (ending + 1) % EN.endings.length;
  return { line, ending };
}

export function sosText(locale: Locale, state: SosState, pick: SosPick): { line: string; ending: string } {
  const texts = TEXTS[locale];
  return { line: texts.lines[state][pick.line], ending: texts.endings[pick.ending] };
}

/** Tests: both languages must offer the same number of lines and endings. */
export const SOS_COUNTS = {
  en: { panic: EN.lines.panic.length, angry: EN.lines.angry.length, endings: EN.endings.length },
  ru: { panic: RU.lines.panic.length, angry: RU.lines.angry.length, endings: RU.endings.length },
};
