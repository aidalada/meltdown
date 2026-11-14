"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false on the server and during hydration, true after. Gate localStorage reads on it. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
