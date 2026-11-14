import type { Locale } from "@/content/locale";
import type { CoachMemory, CoachMessage } from "@/types/coach";
import { ApiResponseSchema, CoachReplySchema } from "./schemas";
import type { NegativeTag, PositiveTag, Safety, Temperament } from "./types";

/*
 * Client for POST /api/coach, Sebastian's live AI reply.
 *
 * The route lives in src/app/api/coach (server side: src/lib/ai/coach.server.ts). askCoach() returns
 * null whenever the caller should answer with the local coach (src/lib/coach.ts): offline mode,
 * timeouts, errors, a missing route, or a reply the server itself built from the local coach
 * (meta.source "fallback"). Both sides then give the same answer, and analytics stay honest.
 *
 * CONTRACT
 *   Request  (CoachApiRequest):  { text, locale, memory, history }
 *   Response (same envelope as /api/turn):
 *     { ok: true, data: CoachApiReply, meta: { source: "ai" | "fallback", latencyMs } }
 *   CoachApiReply:
 *     safety     "none" | "child_at_risk" | "parent_crisis"   (server runs detectSafety first)
 *     lead       one or two short sentences in `locale`: what made it harder, said kindly. No advice
 *                text here: the tip, the reason and the source are rendered from techniques.json.
 *     technique  one PositiveTag to try next (rule 6: only our techniques)
 *     say        optional English phrase the parent could say to the child, 120 characters or fewer
 *     preset     optional preset id that fits the moment ("teeth-bedtime", "leaving-playground", …)
 */
export interface CoachApiRequest {
  /** What the parent wrote, 25 to 400 characters. English or Russian. */
  text: string;
  /** Language for `lead`. `say` is always English: the practice child speaks English. */
  locale: Locale;
  memory: {
    child: { name: string; ageYears: number; temperament: Temperament } | null;
    rehearsals: number;
    calmReached: number;
    /** The harmful habit that shows up most in this parent's rehearsals. */
    struggle: NegativeTag | null;
    lastScenarioTitle: string | null;
    planPhrase: string | null;
  };
  /** The last few messages, oldest first, for context. */
  history: { role: "parent" | "coach"; text: string }[];
}

export interface CoachApiReply {
  safety: Safety;
  lead: string;
  technique: PositiveTag;
  say?: string;
  preset?: string;
}


const PATH = "/api/coach";
const TIMEOUT_MS = 8000;
const HISTORY_ITEMS = 6;
/**
 * Set when the route turns out not to exist, so it is asked only once per page load.
 * A missing route answers 404 or 405 locally, but on Vercel a POST to an unknown path returns
 * 200 with the HTML "not found" page, so anything that is not JSON counts as missing too.
 */
let missing = false;

function isOffline(): boolean {
  try {
    return sessionStorage.getItem("meltdown:v1:offline") === "1";
  } catch {
    return false;
  }
}

/** The request body for a parent's message. Only what the model needs; nothing else leaves the browser. */
export function coachRequest(text: string, locale: Locale, memory: CoachMemory, messages: CoachMessage[]): CoachApiRequest {
  return {
    text,
    locale,
    memory: {
      child: memory.child,
      rehearsals: memory.rehearsals,
      calmReached: memory.calmReached,
      struggle: memory.struggle,
      lastScenarioTitle: memory.lastSession?.title ?? null,
      planPhrase: memory.plan?.phrase ?? null,
    },
    history: messages.slice(-HISTORY_ITEMS).map((m) => ({ role: m.role, text: m.role === "parent" ? m.text : m.lines.join(" ") })),
  };
}

/** Sebastian's reply from the model, or null when the caller should use the local coach instead. */
export async function askCoach(request: CoachApiRequest): Promise<CoachApiReply | null> {
  if (missing || isOffline()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(PATH, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request), signal: controller.signal,
    });
    const json = response.headers.get("content-type")?.includes("application/json") ?? false;
    if (response.status === 404 || response.status === 405 || (response.ok && !json)) missing = true;
    if (response.status !== 200 || !json) return null;
    const parsed = ApiResponseSchema(CoachReplySchema).safeParse(await response.json());
    return parsed.success && parsed.data.ok && parsed.data.meta.source === "ai" ? parsed.data.data : null;
  } catch {
    return null;   // network error, timeout or a body that is not JSON
  } finally {
    clearTimeout(timer);
  }
}

/** Tests only: forget that the route was missing. */
export function resetCoachApi(): void {
  missing = false;
}
