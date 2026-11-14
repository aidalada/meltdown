"use client";

import { isTexting } from "@/lib/age";
import { ageGroupOf } from "@/lib/data";
import { ChildAvatar } from "./ChildAvatar";
import { Icon } from "./Icon";

/**
 * The practice child at a glance: the 2D face for ages under 12, a chat symbol for 12+, where the
 * rehearsal is a text conversation. Decorative: nearby text names the child.
 */
export function ChildBadge({ years, size }: { years: number; size: number }) {
  if (isTexting(years)) {
    return (
      <span className="child-badge-chat" style={{ width: size, height: size }} aria-hidden="true">
        <Icon name="say" size={Math.round(size * 0.5)} />
      </span>
    );
  }
  return <ChildAvatar band="calm" speaking={false} thinking={false} name="" age={ageGroupOf(years)} size={size} showName={false} decorative />;
}
