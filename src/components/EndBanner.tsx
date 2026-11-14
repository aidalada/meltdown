import { copy } from "@/content/copy";
import type { Outcome } from "@/lib/types";

export function EndBanner({ outcome, name, turns, onDebrief }: { outcome: Outcome; name: string; turns: number; onDebrief(): void }) {
  const success = outcome === "calm_reached";
  return (
    <div className={`card flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-[18px] ${success ? "border-[#BFE3CE] bg-good-soft" : ""}`}>
      <p className="font-display text-xl font-extrabold">{success ? copy.rehearsal.success(name, turns) : copy.rehearsal.limit}</p>
      <button className="btn btn-primary" type="button" onClick={onDebrief}>{copy.rehearsal.toDebrief}</button>
    </div>
  );
}
