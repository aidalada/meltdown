"use client";

import { useCopy } from "@/content/i18n";

export function Disclaimer({ variant }: { variant: "short" | "full" }) {
  const copy = useCopy();
  return <p className="text-[13px] text-muted">{variant === "short" ? copy.disclaimer.short : copy.disclaimer.full}</p>;
}
