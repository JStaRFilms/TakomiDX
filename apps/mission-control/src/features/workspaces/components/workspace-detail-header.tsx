import type { WorkspaceRuntimeState, WorkspaceSummary } from "@takomi/contracts";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  deriveRuntimeWorkspaceStatus,
  isWorkspacePreviewLive,
  isWorkspacePreviewUsingFallback,
  resolveWorkspacePreviewUrl,
} from "@/features/workspaces/data/workspace-detail-data";
import { WorkspaceOperatorPanel } from "./workspace-operator-panel";

interface WorkspaceDetailHeaderProps {
  workspace: WorkspaceSummary;
  runtime: WorkspaceRuntimeState | null;
}

export function WorkspaceDetailHeader({ workspace, runtime }: WorkspaceDetailHeaderProps) {
  const externalAgentLabel =
    workspace.toolFamily?.replace(/_/g, " ") ?? workspace.agentType ?? "External agent";
  const runtimeStatus = deriveRuntimeWorkspaceStatus(runtime);
  const previewHref = resolveWorkspacePreviewUrl(workspace, runtime);
  const canOpenPreview =
    workspace.status === "running" ||
    workspace.status === "awaiting_human" ||
    workspace.status === "validating" ||
    runtimeStatus === "running" ||
    runtimeStatus === "booting";
  const isUsingFallbackPreview = isWorkspacePreviewUsingFallback(runtime);
  const isLivePreviewHost = isWorkspacePreviewLive(runtime);

  return (
    <div className="mb-4 space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
              <span className="rounded-sm bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] tracking-widest">{workspace.mode}</span>
              <span>{workspace.repoName}</span>
              <span>/</span>
              <span>{workspace.branch}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
                {workspace.slug}
              </h1>
              <StatusBadge status={workspace.status} />
              {/* Show runtime status badge only when it differs from workspace status - avoids duplicate pills */}
              {runtime && runtimeStatus !== workspace.status && (
                <StatusBadge status={runtimeStatus} className="opacity-80" />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-primary)]">
              {workspace.ownership === "external" ? `${externalAgentLabel} (ext)` : workspace.agentType}
            </span>
            {workspace.pid && (
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-ink-muted)]">
                PID {workspace.pid}
              </span>
            )}
            {workspace.cwd && (
              <span
                className="max-w-[280px] truncate rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-ink-muted)]"
                title={workspace.cwd}
              >
                CWD {workspace.cwd}
              </span>
            )}
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

        {runtime && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
            Runtime:
            <span className="ml-1 font-mono text-[var(--color-ink)]">{runtime.lifecycle}</span>
            {runtime.assignedHostPort && (
              <>
                <span className="mx-2 text-[var(--color-ink-faint)]">/</span>
                <span className="font-mono text-[var(--color-ink)]">{previewHref}</span>
              </>
            )}
            {runtime.preview && (
              <>
                <span className="mx-2 text-[var(--color-ink-faint)]">/</span>
                <span className="font-mono text-[var(--color-ink)]">
                  {isLivePreviewHost
                    ? "host live"
                    : isUsingFallbackPreview
                      ? "fallback path"
                      : "host warming"}
                </span>
              </>
            )}
          </div>
        )}

        {runtimeStatus === "booting" && (
          <div className="rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)]">
            Docker is up, but the app inside is still warming. First boot may download `corepack`
            and pnpm packages into shared Docker cache volumes, then install dependencies into this
            workspace before the local preview URL starts responding.
          </div>
        )}

        {runtime?.preview && !isLivePreviewHost && (
          <div className="rounded-lg border border-[var(--color-warning)]/25 bg-[var(--color-warning)]/8 px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)]">
            {isUsingFallbackPreview
              ? "TakomiDX detected the workspace route, but the local edge proxy is unavailable on this machine. Use the fallback port URL until the proxy can bind the preview host."
              : "TakomiDX has the preview host registered, but the host path is not live yet. Keep using the workspace page while the runtime or proxy health settles."}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canOpenPreview && (
            <Link
              href={previewHref}
              target="_blank"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono text-sm font-semibold text-[var(--color-ink)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {isUsingFallbackPreview
                ? "Open Fallback Preview"
                : isLivePreviewHost
                  ? "Open Preview Host"
                  : "Open Preview Route"}
            </Link>
          )}
        </div>
      </div>

      <WorkspaceOperatorPanel workspace={workspace} runtime={runtime} />
    </div>
  );
}
