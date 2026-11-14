import { runDebrief } from "@/lib/ai/debrief.server";
import { postHandler } from "@/lib/http";
import { DebriefRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const POST = postHandler("debrief", DebriefRequestSchema, runDebrief);
