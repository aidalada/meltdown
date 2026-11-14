"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "meltdown:v1:offline";
const EVENT = "meltdown:offline-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getSnapshot(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Reads ?offline=1 / ?offline=0 once (SPEC 11.4) and reports whether offline demo mode is on. */
export function useOffline(): boolean {
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("offline");
    if (value !== "1" && value !== "0") return;
    try {
      if (value === "1") sessionStorage.setItem(KEY, "1");
      else sessionStorage.removeItem(KEY);
    } catch {
      // storage blocked: stay online
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
