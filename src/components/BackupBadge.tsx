"use client";

import { useCopy } from "@/content/i18n";

export function BackupBadge({ visible }: { visible: boolean }) {
  const copy = useCopy();
  if (!visible) return null;
  return (
    <span className="pill pill-accent cursor-help" title={copy.rehearsal.backupHint} tabIndex={0}>
      {copy.rehearsal.backup}
      <span className="sr-only">: {copy.rehearsal.backupHint}</span>
    </span>
  );
}
