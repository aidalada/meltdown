import { describe, expect, it } from "vitest";
import { textsFor } from "@/content/locale";
import { CoachReplySchema, CoachRequestSchema, type CoachModelOutput, type CoachRequest } from "../schemas";
import { finalizeCoach, localCoachReply } from "./coach";

const NOW = new Date("2026-11-15T19:45:00.000Z");

function request(text: string, locale: "en" | "ru" = "en"): CoachRequest {
  return CoachRequestSchema.parse({
    text, locale, history: [],
    memory: {
      child: { name: "Max", ageYears: 4, temperament: "strong-willed" }, rehearsals: 1, calmReached: 0,
      struggle: "threat", lastScenarioTitle: null, planPhrase: null,
    },
  });
}

const MODEL: CoachModelOutput = {
  safety: "none",
  lead: "The iPad threat turned teeth into a power fight.",
  technique: "offer_choice",
  say: "Top teeth first or bottom teeth first?",
  preset: "teeth-bedtime",
};

describe("localCoachReply", () => {
  it("answers an English story with a technique, a phrase and the matching preset", () => {
    const reply = localCoachReply(request("Bedtime again. I told him no iPad tomorrow if he doesn't brush his teeth."), NOW);
    expect(CoachReplySchema.parse(reply)).toEqual(reply);
    expect(reply.safety).toBe("none");
    expect(["offer_choice", "when_then"]).toContain(reply.technique);
    expect(reply.preset).toBe("teeth-bedtime");
  });

  it("answers in Russian and keeps the phrase in English", () => {
    const reply = localCoachReply(request("Вечером опять истерика из-за зубов, я пригрозила, что не будет мультиков.", "ru"), NOW);
    expect(reply.lead).toMatch(/[а-яё]/i);
    if (reply.say) expect(reply.say).not.toMatch(/[а-яё]/i);
  });

  it("flags crisis words in either language", () => {
    expect(localCoachReply(request("Some nights I honestly want to die, I can't do this anymore."), NOW).safety).toBe("parent_crisis");
    expect(localCoachReply(request("Я так устала, иногда не хочу жить, всё валится из рук.", "ru"), NOW).safety).toBe("parent_crisis");
  });
});

describe("finalizeCoach", () => {
  const req = request("Bedtime again. I told him no iPad tomorrow if he doesn't brush his teeth.");
  const local = localCoachReply(req, NOW);

  it("keeps a clean model answer", () => {
    expect(finalizeCoach(req, MODEL, local)).toEqual({ safety: "none", lead: MODEL.lead, technique: "offer_choice", say: MODEL.say, preset: "teeth-bedtime" });
  });

  it("strips quotes, drops an empty phrase and an unknown preset", () => {
    const out = finalizeCoach(req, { ...MODEL, lead: ` "${MODEL.lead}" `, say: "", preset: "none" }, local);
    expect(out.lead).toBe(MODEL.lead);
    expect(out).not.toHaveProperty("say");
    expect(out.preset).toBe(local.preset);
    expect(finalizeCoach(req, { ...MODEL, preset: "made-up" }, local).preset).toBe(local.preset);
  });

  it("replaces an age-inappropriate suggestion with an eligible local preset or omits it", () => {
    const older = request("Каждое утро отказывается одеваться и надевать ботинки.", "ru");
    older.memory.child!.ageYears = 12;
    const local = localCoachReply(older, NOW);
    expect(local.preset).toBe("school-morning");
    expect(finalizeCoach(older, { ...MODEL, preset: "getting-dressed" }, local).preset).toBe("school-morning");
    expect(finalizeCoach(older, MODEL, { ...local, preset: "leaving-playground" })).not.toHaveProperty("preset");
    expect(finalizeCoach(older, { ...MODEL, preset: "phone-bedtime" }, local).preset).toBe("phone-bedtime");
  });

  it("omits the local preset when the topic has no option for the stated age", () => {
    const req = request("My 12-year-old won't brush his teeth and wants another five minutes.");
    req.memory.child = null;
    expect(localCoachReply(req, NOW)).not.toHaveProperty("preset");
  });

  it("falls back to the local lead when the model writes in the wrong language", () => {
    expect(finalizeCoach(req, { ...MODEL, lead: "Угроза сделала только хуже." }, local).lead).toBe(local.lead);
    const ru = request("Вечером опять истерика из-за зубов, я пригрозила, что не будет мультиков.", "ru");
    const ruLocal = localCoachReply(ru, NOW);
    expect(finalizeCoach(ru, MODEL, ruLocal).lead).toBe(ruLocal.lead);
    expect(finalizeCoach(ru, { ...MODEL, lead: "Угроза превратила зубы в борьбу." }, ruLocal).lead).toBe("Угроза превратила зубы в борьбу.");
  });

  it("drops a phrase that is too long or not English", () => {
    expect(finalizeCoach(req, { ...MODEL, say: "Сначала верхние зубы или нижние?" }, local)).not.toHaveProperty("say");
    expect(finalizeCoach(req, { ...MODEL, say: "word ".repeat(40) }, local)).not.toHaveProperty("say");
  });

  it("clips a long lead to the contract limit", () => {
    const out = finalizeCoach(req, { ...MODEL, lead: "This is a long sentence. ".repeat(40) }, local);
    expect(out.lead.length).toBeLessThanOrEqual(400);
    expect(CoachReplySchema.safeParse(out).success).toBe(true);
  });

  it("turns a model safety flag into the safety line", () => {
    const out = finalizeCoach(req, { ...MODEL, safety: "child_at_risk" }, local);
    expect(out).toEqual({ safety: "child_at_risk", lead: textsFor("en").copy.coach.safetyLine, technique: "name_feeling" });
  });
});
