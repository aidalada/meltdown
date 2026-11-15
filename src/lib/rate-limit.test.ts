import { expect, it } from "vitest";
import { allowRequest } from "./rate-limit";

it.each([["turn", 40], ["scenario", 15], ["debrief", 15], ["coach", 30]] as const)(
  "enforces the rolling ten-minute limit for %s", (route, limit) => {
    for (let i = 0; i < limit; i++) expect(allowRequest(route, "rolling", i * 100)).toBe(true);
    expect(allowRequest(route, "rolling", 599_999)).toBe(false);
    expect(allowRequest(route, "rolling", 600_000)).toBe(true);
    expect(allowRequest(route, "rolling", 600_001)).toBe(false);
    expect(allowRequest(route, "rolling", 600_100)).toBe(true);
  },
);

it("counts routes and IPs independently", () => {
  for (let i = 0; i < 15; i++) expect(allowRequest("scenario", "one", 900_000)).toBe(true);
  expect(allowRequest("scenario", "one", 900_001)).toBe(false);
  expect(allowRequest("scenario", "two", 900_001)).toBe(true);
  expect(allowRequest("turn", "one", 900_001)).toBe(true);
  expect(allowRequest("debrief", "one", 900_001)).toBe(true);
});
