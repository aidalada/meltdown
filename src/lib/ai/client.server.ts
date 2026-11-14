import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
const EFFORT = (process.env.ANTHROPIC_EFFORT ?? "low") as "low" | "medium" | "high";
export const MOCK = process.env.MOCK_AI === "1" || !process.env.ANTHROPIC_API_KEY;

export class AiUnavailableError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic(); // ключ из ANTHROPIC_API_KEY
  return client;
}

interface CallJsonOptions<T> {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
  maxRetries?: 0 | 1;
  validate: (raw: unknown) => T; // бросает ошибку, если не прошло zod
}

export async function callJson<T>(o: CallJsonOptions<T>): Promise<T> {
  if (MOCK) throw new AiUnavailableError("mock");

  const params = {
    model: MODEL,
    max_tokens: o.maxTokens,
    system: o.system,
    messages: [{ role: "user" as const, content: o.user }],
    output_config: {
      effort: EFFORT,
      format: { type: "json_schema" as const, schema: o.schema },
    },
  };
  const reqOpts = { timeout: o.timeoutMs, maxRetries: o.maxRetries ?? 1 };

  const res =
    MODEL === "claude-opus-5-5"
      ? await getClient().beta.messages.create(
          { ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" },
          reqOpts,
        )
      : await getClient().messages.create(params, reqOpts);

  if (res.stop_reason === "refusal") throw new AiUnavailableError("refusal");
  if (res.stop_reason === "max_tokens") throw new AiUnavailableError("max_tokens");

  const text = (res.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AiUnavailableError("bad_json");
  }
  try {
    return o.validate(raw);
  } catch {
    throw new AiUnavailableError("schema");
  }
}

export function logAiFailure(route: "turn" | "scenario" | "debrief", err: unknown): void {
  let reason = "unknown";
  if (err instanceof AiUnavailableError) {
    reason = err.reason;
  } else if (err instanceof Anthropic.AnthropicError) {
    reason = err.constructor.name;
    if (err instanceof Anthropic.APIError && typeof err.status === "number") {
      reason += " " + err.status;
    }
  }
  console.warn(JSON.stringify({ route, reason }));
}
