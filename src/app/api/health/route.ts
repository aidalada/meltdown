import { MOCK, MODEL } from "@/lib/ai/client.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export function GET(): Response {
  return Response.json({
    ok: true,
    model: MODEL,
    mock: MOCK,
    version: "1.0",
  });
}
