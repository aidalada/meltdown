import { runTurn } from "@/lib/ai/turn.server";
import { postHandler } from "@/lib/http";
import { TurnRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const POST = postHandler("turn", TurnRequestSchema, runTurn,
  (result) => ({ tags: result.turn.tags.length, safety: result.safety }),
);
