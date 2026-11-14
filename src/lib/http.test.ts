import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { postHandler } from "./http";

const privateText = "private parent marker 81ab";
const childText = "private child marker 59cd";
const payload = JSON.stringify({ parentText: privateText, childReply: childText });
const schema = z.object({ parentText: z.string(), childReply: z.string() });
const run = vi.fn(async () => ({ result: { reply: childText }, source: "ai" as const }));
const post = postHandler("turn", schema, run);

function request(ip: string, body = payload, contentType = "application/json"): Request {
  return new Request("http://localhost/api/turn", {
    method: "POST", headers: { "Content-Type": contentType, "x-forwarded-for": ip }, body,
  });
}

beforeEach(() => {
  run.mockClear();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  try {
    const info = vi.mocked(console.info).mock.calls;
    expect(info.length).toBeGreaterThan(0);
    for (const args of [...info, ...vi.mocked(console.warn).mock.calls]) {
      const line = args.map((arg) => arg instanceof Error ? arg.stack : JSON.stringify(arg)).join(" ");
      expect(line).not.toContain(privateText);
      expect(line).not.toContain(childText);
    }
  } finally {
    vi.restoreAllMocks();
  }
});

it.each([
  ["malformed JSON", "192.0.2.1", payload.slice(0, -1), "application/json"],
  ["wrong Content-Type", "192.0.2.2", payload, "text/plain"],
  ["more than 16 KiB in UTF-8", "192.0.2.3", JSON.stringify({ parentText: privateText + "ж".repeat(8192), childReply: childText }), "application/json"],
  ["invalid schema", "192.0.2.4", JSON.stringify({ parentText: [privateText], childReply: childText }), "application/json"],
])("rejects %s before calling run", async (_name, ip, body, contentType) => {
  const res = await post(request(ip, body, contentType));
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ ok: false, error: { code: "BAD_REQUEST", message: "Bad request" } });
  expect(run).not.toHaveBeenCalled();
});

it("returns the server result with source and latency", async () => {
  const res = await post(request("192.0.2.5"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual({ ok: true, data: { reply: childText }, meta: { source: "ai", latencyMs: expect.any(Number) } });
  expect(body.meta.latencyMs).toBeGreaterThanOrEqual(0);
  expect(run).toHaveBeenCalledOnce();
  expect(run).toHaveBeenCalledWith({ parentText: privateText, childReply: childText });
});

it("limits the first forwarded IP and returns the public 429 message", async () => {
  for (let i = 0; i < 40; i++) expect((await post(request("192.0.2.6, 198.51.100.1"))).status).toBe(200);
  const res = await post(request("192.0.2.6, 198.51.100.2"));
  expect(res.status).toBe(429);
  expect(await res.json()).toEqual({ ok: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a few minutes." } });
  expect(run).toHaveBeenCalledTimes(40);
});

it("returns only the public 500 envelope when run throws", async () => {
  run.mockRejectedValueOnce(new Error(privateText));
  const res = await post(request("192.0.2.7"));
  expect(res.status).toBe(500);
  expect(await res.json()).toEqual({ ok: false, error: { code: "INTERNAL", message: "Something went wrong." } });
  expect(run).toHaveBeenCalledOnce();
});
