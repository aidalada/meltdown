import { copy } from "@/content/copy";

export function Disclaimer({ variant }: { variant: "short" | "full" }) {
  return <p className="text-[13px] text-muted">{variant === "short" ? copy.disclaimer.short : copy.disclaimer.full}</p>;
}
