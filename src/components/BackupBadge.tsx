import { copy } from "@/content/copy";

export function BackupBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="pill pill-accent cursor-help" title={copy.rehearsal.backupHint} tabIndex={0}>
      {copy.rehearsal.backup}
      <span className="sr-only">: {copy.rehearsal.backupHint}</span>
    </span>
  );
}
