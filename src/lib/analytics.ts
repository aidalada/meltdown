import type { PostHog } from "posthog-js";

export type EventName =
  | "landing_view" | "start_practice" | "scenario_result" | "turn_completed" | "session_completed"
  | "debrief_viewed" | "plan_copied" | "plan_saved" | "pricing_view" | "buy_click"
  | "safety_shown" | "checkin";

let client: Promise<PostHog | null> | null = null;

function getClient(): Promise<PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (typeof window === "undefined" || !key) return Promise.resolve(null);
  client ??= import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        autocapture: false,
        persistence: "localStorage",
      });
      return posthog;
    })
    .catch(() => null);
  return client;
}

/** Never pass parent or child text in props (SPEC 16.1). Without a PostHog key this does nothing. */
export function track(event: EventName, props?: Record<string, string | number | boolean>): void {
  void getClient().then((posthog) => {
    try {
      posthog?.capture(event, props);
    } catch {
      // analytics must never break the app
    }
  });
}
