export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export function GET(): Response {
  return Response.json({
    ok: true,
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    mock: process.env.MOCK_AI === "1" || !process.env.ANTHROPIC_API_KEY,
    version: "1.0",
  });
}
