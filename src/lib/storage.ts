import { z } from "zod";
import { SESSIONS_KEEP } from "./constants";
import { PlanPhraseSchema, ProfileSchema, SessionSchema } from "./schemas";
import type { PlanPhrase, Profile, Session } from "./types";

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const PREFIX = "meltdown:v1:";
const KEYS = {
  sessions: `${PREFIX}sessions`,
  session: (id: string) => `${PREFIX}session:${id}`,
  profile: `${PREFIX}profile`,
  plan: `${PREFIX}plan`,
  trial: `${PREFIX}trial`,
};

const IndexSchema = z.array(z.string());
const PlanSchema = z.object({ sessionId: z.string(), createdAt: z.string(), phrases: z.array(PlanPhraseSchema) });
const TrialSchema = z.object({ startedAt: z.iso.datetime({ offset: true }) });
export type SavedPlan = z.infer<typeof PlanSchema>;

/** localStorage, or null on the server and when storage is blocked (private mode). */
export function getStore(): KV | null {
  if (typeof window === "undefined") return null;
  try {
    const store = window.localStorage;
    const probe = `${PREFIX}probe`;
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

function resolve(kv: KV | null | undefined): KV | null {
  return kv === undefined ? getStore() : kv;
}

function read<T>(kv: KV | null, key: string, schema: z.ZodType<T>): T | null {
  if (!kv) return null;
  let raw: string | null;
  try {
    raw = kv.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // corrupted JSON falls through to removal
  }
  try {
    kv.removeItem(key);
  } catch {
    // ignore
  }
  return null;
}

function write(kv: KV | null, key: string, value: unknown): void {
  if (!kv) return;
  try {
    kv.setItem(key, JSON.stringify(value));
  } catch {
    // quota or private mode: the UI keeps working without persistence
  }
}

export function loadSession(id: string, kv?: KV | null): Session | null {
  return read(resolve(kv), KEYS.session(id), SessionSchema);
}

export function saveSession(s: Session, kv?: KV | null): void {
  const store = resolve(kv);
  if (!store) return;
  write(store, KEYS.session(s.id), s);
  const ids = [s.id, ...(read(store, KEYS.sessions, IndexSchema) ?? []).filter((id) => id !== s.id)];
  for (const old of ids.slice(SESSIONS_KEEP)) {
    try {
      store.removeItem(KEYS.session(old));
    } catch {
      // ignore
    }
  }
  write(store, KEYS.sessions, ids.slice(0, SESSIONS_KEEP));
}

export function listSessions(kv?: KV | null): Session[] {
  const store = resolve(kv);
  return (read(store, KEYS.sessions, IndexSchema) ?? [])
    .map((id) => loadSession(id, store))
    .filter((s): s is Session => s !== null);
}

export function loadProfile(kv?: KV | null): Profile | null {
  return read(resolve(kv), KEYS.profile, ProfileSchema);
}

export function saveProfile(p: Profile, kv?: KV | null): void {
  write(resolve(kv), KEYS.profile, p);
}

export function savePlan(sessionId: string, phrases: PlanPhrase[], kv?: KV | null): void {
  write(resolve(kv), KEYS.plan, { sessionId, createdAt: new Date().toISOString(), phrases });
}

export function loadPlan(kv?: KV | null): SavedPlan | null {
  return read(resolve(kv), KEYS.plan, PlanSchema);
}

export function ensureTrialStarted(kv?: KV | null): string {
  const store = resolve(kv);
  const existing = read(store, KEYS.trial, TrialSchema);
  if (existing) return existing.startedAt;
  const startedAt = new Date().toISOString();
  write(store, KEYS.trial, { startedAt });
  return startedAt;
}

/** Day of the free trial, starting at 1. Returns 0 when the trial has not started. */
export function trialDay(now: Date = new Date(), kv?: KV | null): number {
  const trial = read(resolve(kv), KEYS.trial, TrialSchema);
  if (!trial) return 0;
  const days = Math.floor((now.getTime() - new Date(trial.startedAt).getTime()) / 86_400_000);
  return Math.max(1, days + 1);
}
