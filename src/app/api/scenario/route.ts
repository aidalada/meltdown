import { runScenario } from "@/lib/ai/scenario.server";
import { postHandler } from "@/lib/http";
import { ScenarioRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const POST = postHandler("scenario", ScenarioRequestSchema, runScenario,
  (result) => ({ tags: 0, safety: result.kind === "safety" ? result.safety : "none" }),
);
