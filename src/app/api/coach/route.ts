import { runCoach } from "@/lib/ai/coach.server";
import { postHandler } from "@/lib/http";
import { CoachRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Sebastian's reply. Contract and fallback rules: src/lib/coach-client.ts and src/lib/engine/coach.ts. */
export const POST = postHandler("coach", CoachRequestSchema, runCoach, (result) => ({ tags: 0, safety: result.safety }));
