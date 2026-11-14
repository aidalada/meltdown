"use client";

import { useEffect } from "react";
import { track, type EventName } from "@/lib/analytics";

/** Fires one analytics event when a page mounts. */
export function TrackView({ event }: { event: EventName }) {
  useEffect(() => {
    track(event);
  }, [event]);
  return null;
}
