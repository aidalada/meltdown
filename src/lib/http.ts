import type { ZodType } from "zod";
import { allowRequest, type RateLimitedRoute } from "./rate-limit";
import type { ApiResponse, Safety, Source } from "./types";

const maxBodyBytes = 16 * 1024;
const errors = {
  BAD_REQUEST: { status: 400, message: "Bad request" },
  RATE_LIMITED: { status: 429, message: "Too many requests. Please wait a few minutes." },
  INTERNAL: { status: 500, message: "Something went wrong." },
} as const;

class BadRequest extends Error {}

async function readBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json" || !request.body ||
      Number(request.headers.get("content-length")) > maxBodyBytes) throw new BadRequest();

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) {
        void reader.cancel().catch(() => {});
        throw new BadRequest();
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    throw new BadRequest();
  } finally {
    reader.releaseLock();
  }
}

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

type LogDetails = { tags: number; safety: Safety };

export function postHandler<Input, Result>(
  route: RateLimitedRoute,
  schema: ZodType<Input>,
  run: (req: Input) => Promise<{ result: Result; source: Source }>,
  details?: (result: Result) => LogDetails,
) {
  return async (request: Request): Promise<Response> => {
    const started = Date.now();
    function failure(code: keyof typeof errors): Response {
      const { status, message } = errors[code];
      console.info(JSON.stringify({ route, source: null, latencyMs: Date.now() - started, tags: 0, safety: "none", reason: code }));
      return Response.json({ ok: false, error: { code, message } } satisfies ApiResponse<Result>, { status });
    }

    try {
      if (!allowRequest(route, clientIp(request), started)) return failure("RATE_LIMITED");
      const input = schema.safeParse(await readBody(request));
      if (!input.success) return failure("BAD_REQUEST");
      const { result, source } = await run(input.data);
      const latencyMs = Date.now() - started;
      const { tags, safety } = details?.(result) ?? { tags: 0, safety: "none" };
      console.info(JSON.stringify({ route, source, latencyMs, tags, safety }));
      return Response.json({ ok: true, data: result, meta: { source, latencyMs } } satisfies ApiResponse<Result>);
    } catch (error) {
      return failure(error instanceof BadRequest ? "BAD_REQUEST" : "INTERNAL");
    }
  };
}
