"use client";

import { useEffect, useRef } from "react";
import { copy } from "@/content/copy";
import type { AppliedTag } from "@/lib/types";
import { TagChip } from "./TagChip";

export type TranscriptItem =
  | { role: "child"; text: string }
  | { role: "parent"; text: string; tags: AppliedTag[] }
  | { role: "thinking"; name: string };

export function Transcript({ items, showHints }: { items: TranscriptItem[]; showHints: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (items.length > 1) end.current?.previousElementSibling?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [items.length]);
  return (
    <div className="flex min-h-[200px] flex-col gap-3 pt-1 pb-2" aria-live="polite">
      {items.map((item, i) => {
        if (item.role === "child") {
          return <div key={i} className="msg msg-child"><div className="bubble bubble-child">{item.text}</div></div>;
        }
        if (item.role === "thinking") {
          return (
            <div key={i} className="msg msg-child">
              <div className="bubble bubble-child typing" role="status" aria-label={copy.rehearsal.thinking(item.name)}>
                <i /><i /><i />
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="msg msg-parent">
            <div className="bubble bubble-parent">{item.text}</div>
            {showHints && item.tags.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1.5">
                {item.tags.map((t) => <TagChip key={t.tag} tag={t.tag} applied={t.applied} />)}
              </div>
            )}
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}
