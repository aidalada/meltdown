import { expect, it } from "vitest";
import { detectSafety, maxSafety } from "./safety";

it.each([
  ["I will HURT   myself", "parent_crisis"],
  ["feeling suicidal", "parent_crisis"],
  ["I want to die", "parent_crisis"],
  ["end my life", "parent_crisis"],
  ["I shook my baby", "child_at_risk"],
  ["I punched him", "child_at_risk"],
  ["I might hurt her", "child_at_risk"],
  ["he is not breathing", "child_at_risk"],
  ["she swallowed a battery", "child_at_risk"],
  ["I hit him and want to die", "parent_crisis"],
  ["Don't hit her. I'll hit him.", "child_at_risk"],
  ["Don't hit her. She's not breathing.", "child_at_risk"],
  ["Do not hurt them. I want to die.", "parent_crisis"],
  ["Иногда мне кажется, что я не хочу жить.", "parent_crisis"],
  ["Я хочу умереть.", "parent_crisis"],
  ["Я ударила его.", "child_at_risk"],
  ["Ребёнок проглотил батарейку.", "child_at_risk"],
  ["Я не ударила её, но потом ударила сына.", "child_at_risk"],
  ["Я не ударила его, но он не дышит.", "child_at_risk"],
  ["I hit him. Я не хочу жить.", "parent_crisis"],
  ["Я трясла малыша. I want to die.", "parent_crisis"],
] as const)("recognizes safety signal in %s", (text, expected) => {
  expect(detectSafety(text)).toBe(expected);
});

it.each([
  "I can't do this anymore", "no iPad tomorrow", "I hurt my foot", "We hit the road",
  "The tablet is dead", "He shook his head", "She swallowed water", "I want to diet",
  "I won’t let you hit her", "Don't hit her", "Do not hit her", "DON’T   hurt them",
  "Я очень злилась, но не ударила его", "Я пригрозила забрать планшет",
  "Я НЕ   БИЛА её", "Я любила дочку и хотела помочь",
])("accepts ordinary phrase %s", (text) => {
  expect(detectSafety(text)).toBe("none");
});

it("chooses the more severe signal in either order", () => {
  expect(maxSafety("parent_crisis", "child_at_risk")).toBe("parent_crisis");
  expect(maxSafety("none", "child_at_risk")).toBe("child_at_risk");
  expect(maxSafety("child_at_risk", "parent_crisis")).toBe("parent_crisis");
});
