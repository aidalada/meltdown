import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE, loadChildFacts, loadCoachThread, loadProfile, saveChildFacts, saveProfile } from "@/lib/storage";
import type { Safety } from "@/lib/types";
import { useCoach } from "./useCoach";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const profile = { ...DEFAULT_PROFILE, childName: "Jessica", ageYears: 7 };
const facts = { named: true, gender: "girl" } as const;

function renderCoach() {
  const result: { coach?: ReturnType<typeof useCoach> } = {};
  function TestCoach() {
    result.coach = useCoach();
    return null;
  }
  renderToStaticMarkup(createElement(TestCoach));
  if (!result.coach) throw new Error("Coach did not render");
  return result.coach;
}

function replyFromModel(safety: Safety) {
  fetchMock.mockResolvedValue(Response.json({
    ok: true,
    data: { safety, lead: "Let's slow down.", technique: "name_feeling" },
    meta: { source: "ai", latencyMs: 10 },
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  const storage = new Map<string, string>();
  vi.stubGlobal("window", {
    location: { search: "" },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("keeps the saved profile when the local safety check flags a chat message", async () => {
  saveProfile(profile);
  saveChildFacts(facts);
  const pending = renderCoach().send("I hit my son");
  await vi.advanceTimersByTimeAsync(700);
  expect(await pending).toBe(true);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(loadProfile()).toEqual(profile);
  expect(loadChildFacts()).toEqual(facts);
  expect(loadCoachThread().at(-1)).not.toHaveProperty("remembered");
});

it("keeps the saved profile when only the model flags a chat message", async () => {
  saveProfile(profile);
  saveChildFacts(facts);
  replyFromModel("child_at_risk");
  const pending = renderCoach().send("My son Leo is 9. I pinned him down until he stopped struggling.");
  await vi.advanceTimersByTimeAsync(700);
  expect(await pending).toBe(true);
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(loadProfile()).toEqual(profile);
  expect(loadChildFacts()).toEqual(facts);
  expect(loadCoachThread().at(-1)).not.toHaveProperty("remembered");
});

it("saves the name and exact age after a safe chat response", async () => {
  replyFromModel("none");
  const pending = renderCoach().send("My daughter Jessica is 7. She refused to brush her teeth before bed.");
  expect(loadProfile()).toBeNull();
  await vi.advanceTimersByTimeAsync(700);
  expect(await pending).toBe(true);
  expect(loadProfile()).toEqual(profile);
  expect(loadChildFacts()).toEqual(facts);
  expect(loadCoachThread().at(-1)).toHaveProperty("remembered");
});

it("does not restore forgotten data when a reply arrives later", async () => {
  replyFromModel("none");
  const coach = renderCoach();
  const pending = coach.send("My daughter Jessica is 7. She refused to brush her teeth before bed.");
  coach.forget();
  await vi.advanceTimersByTimeAsync(700);
  expect(await pending).toBe(false);
  expect(loadProfile()).toBeNull();
  expect(loadCoachThread()).toEqual([]);
});
