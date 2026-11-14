"use client";

import { useCopy } from "@/content/i18n";
import { bandOf } from "@/lib/engine/mood";
import type { MoodBand } from "@/lib/types";
import { MOOD_COLOR } from "./ChildAvatar";
import { signed } from "./TagChip";

const ZONES: [MoodBand, number][] = [["meltdown", 20.5], ["upset", 20], ["grumpy", 20], ["warming", 19], ["calm", 20.5]];

/**
 * Five colored zones, a marker and a text label (SPEC 13.4). Pass `deltaKey` (for example the turn
 * count) so the delta chip re-mounts and replays its animation on every new turn.
 */
export function MoodMeter({ value, delta, deltaKey }: { value: number; delta: number | null; deltaKey?: number }) {
  const copy = useCopy();
  const label = copy.rehearsal.calmLevel(value, copy.bands[bandOf(value)]);
  const tone = delta === null ? "" : delta > 0 ? "delta-up" : delta < 0 ? "delta-down" : "delta-flat";
  return (
    <div className="meter">
      <div className="meter-track" aria-hidden="true">
        {ZONES.map(([band, width]) => (
          <span key={band} className="z" style={{ flex: width, background: MOOD_COLOR[band] }} />
        ))}
        <span className="meter-marker" style={{ left: `${value}%` }} />
      </div>
      <div className="meter-label">
        <span>{label}</span>
        {delta !== null && (
          <span key={deltaKey} className={`delta-chip ${tone}`}>
            {signed(delta)}
          </span>
        )}
      </div>
    </div>
  );
}
