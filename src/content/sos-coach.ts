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
      "Put your hands on something solid, the counter or your knees. You're the adult here, and you're safe.",
      "Lower your voice before you say anything. A whisper calms a room faster than a shout.",
      "It's okay to take two steps back. Your child is safe, so you can breathe first.",
      "Say it to yourself: \"I'm overwhelmed.\" Naming it already takes the edge off.",
      "Unclench your jaw and drop your shoulders. Your body tells your child how this will go.",
      "You don't need the perfect words. Get down to their eye level and just be there.",
      "Find five things you can see. It pulls your brain out of alarm mode.",
      "This will pass. Every meltdown ends, and this one will too.",
      "Breathe in for four, out for six. Do it twice before you speak.",
    ],
    angry: [
      "Being angry doesn't make you a bad parent. What you do next is what counts.",
      "Take three slow breaths before you speak. Anger fades; words are hard to take back.",
      "Step away for a minute if you need to. Say: \"I need a moment. I'll be right back.\"",
      "Keep your hands still and your voice low. Firm doesn't have to be loud.",
      "Say one short sentence, then stop: \"I won't let you hit. I'm here.\"",
      "Hold something cold or splash water on your face. It cools anger down in your body.",
      "Your child isn't giving you a hard time. They're having a hard time.",
      "Squeeze your fists for five seconds, then open them. Let the anger leave through your hands.",
      "You can be angry and still choose a calm voice. That's exactly the skill you're building.",
      "Right now you're showing your child how to handle anger. They're watching, and learning.",
    ],
  },
  endings: [
    "Tonight, when things settle, tell me how it went and we'll go through it together.",
    "When you're free after work, message me and we'll unpack it step by step.",
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
      "Обопритесь руками о что-то твёрдое: стол или колени. Вы здесь взрослый, и вы в безопасности.",
      "Сначала понизьте голос. Шёпот успокаивает быстрее, чем крик.",
      "Можно отойти на два шага. Ребёнок в безопасности, значит, сначала можно выдохнуть.",
      "Скажите себе: «Я на пределе». Когда назовёшь это, уже становится легче.",
      "Разожмите челюсть и опустите плечи. Ваше тело подсказывает ребёнку, чем всё закончится.",
      "Идеальные слова не нужны. Присядьте на уровень его глаз и просто будьте рядом.",
      "Найдите глазами пять предметов вокруг. Это выводит мозг из режима тревоги.",
      "Это пройдёт. Любая истерика заканчивается, и эта тоже.",
      "Вдох на четыре счёта, выдох на шесть. Дважды, прежде чем что-то сказать.",
    ],
    angry: [
      "Злость не делает вас плохим родителем. Важно то, что вы сделаете дальше.",
      "Три медленных вдоха, прежде чем говорить. Злость пройдёт, а слова назад не вернёшь.",
      "Если нужно, отойдите на минуту. Скажите: «Мне нужна минутка. Я сейчас вернусь».",
      "Руки спокойно, голос тихо. Твёрдо не значит громко.",
      "Одна короткая фраза, и всё: «Я не дам тебе драться. Я рядом».",
      "Возьмите что-то холодное или умойтесь холодной водой. Это остужает злость в теле.",
      "Ребёнок не делает вам плохо. Ему самому сейчас плохо.",
      "Сожмите кулаки на пять секунд и разожмите. Пусть злость уйдёт через руки.",
      "Можно злиться и всё равно говорить спокойно. Именно этому вы и учитесь.",
      "Сейчас вы показываете ребёнку, как справляться со злостью. Он смотрит и учится.",
    ],
  },
  endings: [
    "Вечером, когда всё уляжется, расскажите мне, как прошло, и разберём вместе.",
    "Когда освободитесь после работы, напишите мне, разберём по шагам.",
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
