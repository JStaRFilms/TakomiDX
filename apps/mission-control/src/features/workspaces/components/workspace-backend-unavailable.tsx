import { EmptyState } from "@/components/ui/empty-state";

interface WorkspaceUnavailableHeaderProps {
  workspaceId: string;
}

interface WorkspaceBackendUnavailablePanelProps {
  workspaceId: string;
  area?: string;
}

export function WorkspaceUnavailableHeader({
  workspaceId,
}: WorkspaceUnavailableHeaderProps) {
  return (
    <div className="mb-4 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            <span>workspace</span>
            <span>/</span>
            <span>{workspaceId}</span>
          </div>
          <h1 className="mt-2 font-mono text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
            Runtime Daemon Unavailable
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-ink-muted)]">
            Mission Control could not reach `agentd`, so this workspace cannot stream fresh state
            right now. The workspace may still exist normally; refresh after the daemon recovers.
          </p>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceBackendUnavailablePanel({
  workspaceId,
  area = "workspace data",
}: WorkspaceBackendUnavailablePanelProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <EmptyState
        icon="!!"
        title="agentd is unavailable"
        description={`Mission Control could not load ${area} for ${workspaceId} because the runtime daemon is unavailable or restarting.`}
      />
    </div>
  );
}
