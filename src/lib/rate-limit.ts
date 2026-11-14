export type RateLimitedRoute = "turn" | "scenario" | "debrief";

const windowMs = 10 * 60 * 1000;
const limits: Record<RateLimitedRoute, number> = { turn: 40, scenario: 15, debrief: 15 };
const requests = new Map<string, number[]>();
let nextCleanup = 0;

export function allowRequest(route: RateLimitedRoute, ip: string, now: number): boolean {
  const cutoff = now - windowMs;
  if (now >= nextCleanup) {
    for (const [key, times] of requests) {
      if (times[times.length - 1] <= cutoff) requests.delete(key);
    }
    nextCleanup = now + windowMs;
  }
  const key = route + ":" + ip;
  const times = (requests.get(key) ?? []).filter((time) => time > cutoff);
  if (times.length >= limits[route]) return false;
  times.push(now);
  requests.set(key, times);
  return true;
}
