import type { WorkspaceSummary } from "@takomi/contracts";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

interface WorkspaceDetailHeaderProps {
  workspace: WorkspaceSummary;
}

export function WorkspaceDetailHeader({ workspace }: WorkspaceDetailHeaderProps) {
  const canOpenPreview =
    workspace.status === "running" ||
    workspace.status === "awaiting_human" ||
    workspace.status === "validating";

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            <span>{workspace.repoName}</span>
            <span>/</span>
            <span>{workspace.branch}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
              {workspace.slug}
            </h1>
            <StatusBadge status={workspace.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-ink-muted)]">
            ${workspace.tokenCostUsd.toFixed(2)}
          </span>
          <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-ink-muted)]">
            {workspace.elapsedMinutes}m
          </span>
          <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-ink-faint)]">
            {workspace.id}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {workspace.status === "awaiting_human" && (
          <button className="cursor-pointer rounded-lg bg-[var(--color-warning)] px-4 py-2 font-mono text-sm font-semibold text-[var(--color-canvas)] hover:opacity-90">
            Approve Payload
          </button>
        )}
        {workspace.status === "failed" && (
          <button className="cursor-pointer rounded-lg border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 px-4 py-2 font-mono text-sm font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/20">
            Restart Agent
          </button>
        )}
        {canOpenPreview && (
          <Link
            href={`http://${workspace.previewHost}`}
            target="_blank"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono text-sm font-semibold text-[var(--color-ink)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            Open Preview
          </Link>
        )}
      </div>
    </div>
  );
}
