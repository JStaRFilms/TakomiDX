import type { WorkspaceSummary } from "@takomi/contracts";
import Link from "next/link";
import { StatusBadge } from "../ui/status-badge";

interface WorkspaceCardProps {
  workspace: WorkspaceSummary;
}

const getCardAccent = (status: WorkspaceSummary["status"]) => {
  if (status === "failed") return "border-[var(--color-danger)]/50";
  if (status === "awaiting_human") return "border-[var(--color-warning)]/50";
  if (status === "validating") return "border-[var(--color-accent)]/50";
  return "border-[var(--color-primary)]/50";
};

const getCardShadow = (status: WorkspaceSummary["status"]) => {
  if (status === "failed") return "shadow-[0_0_20px_rgba(255,68,68,0.06)]";
  if (status === "awaiting_human") return "shadow-[0_0_20px_rgba(255,176,32,0.06)]";
  if (status === "validating") return "shadow-[0_0_20px_rgba(0,212,255,0.08)]";
  return "shadow-[0_0_20px_rgba(0,229,160,0.04)]";
};

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const isDanger = workspace.status === "failed";
  const isWarning = workspace.status === "awaiting_human";
  const isValidating = workspace.status === "validating";
  const hasLivePreview =
    workspace.status === "running" ||
    workspace.status === "awaiting_human" ||
    workspace.status === "validating";
  const previewLabel =
    workspace.status === "booting"
      ? "starting proxy"
      : hasLivePreview
        ? workspace.previewHost
        : "--";
  const secondaryHref = isDanger
    ? `/workspaces/${workspace.id}/logs`
    : hasLivePreview
      ? `http://${workspace.previewHost}`
      : `/workspaces/${workspace.id}/diff`;
  const secondaryLabel = isDanger ? "Logs" : hasLivePreview ? "Preview" : "Diff";
  const validationLabel = workspace.validation?.status ?? "queued";

  return (
    <article
      className={`relative group flex flex-col rounded-xl border bg-[var(--color-surface)] p-5 transition-all duration-200 hover:-translate-y-[2px] ${getCardAccent(
        workspace.status,
      )} ${getCardShadow(workspace.status)}`}
    >
      <div
        className={`absolute left-0 top-0 h-1 w-full rounded-t-xl bg-gradient-to-r ${isDanger
            ? "from-transparent via-[var(--color-danger)]/40 to-transparent"
            : isWarning
              ? "from-transparent via-[var(--color-warning)]/40 to-transparent"
              : isValidating
                ? "from-transparent via-[var(--color-accent)]/40 to-transparent"
                : "from-transparent via-[var(--color-primary)]/20 to-transparent"
          } opacity-60 transition-opacity group-hover:opacity-100`}
      />

      <div className="mt-1 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
            {workspace.repoName}
          </p>
          <h3 className="mt-1 font-mono text-lg font-semibold text-[var(--color-ink)] transition-colors group-hover:text-white">
            {workspace.slug}
          </h3>
        </div>
        <StatusBadge status={workspace.status} />
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between py-1">
          <dt className="text-[var(--color-ink-muted)]">Branch</dt>
          <dd className="max-w-[200px] truncate font-mono text-[var(--color-ink)]" title={workspace.branch}>
            {workspace.branch}
          </dd>
        </div>
        <div className="flex items-center justify-between py-1">
          <dt className="text-[var(--color-ink-muted)]">Agent</dt>
          <dd className="font-mono text-[var(--color-ink)]">{workspace.agentType}</dd>
        </div>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] py-1 pb-2">
          <dt className="text-[var(--color-ink-muted)]">Preview</dt>
          <dd className="max-w-[200px] truncate font-mono text-xs text-[var(--color-accent)]" title={workspace.previewHost}>
            {previewLabel}
          </dd>
        </div>
        <div className="flex items-center justify-between pt-1">
          <dt className="text-[var(--color-ink-muted)]">Cost</dt>
          <dd className="font-mono text-[var(--color-ink)]">${workspace.tokenCostUsd.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between py-1">
          <dt className="text-[var(--color-ink-muted)]">Elapsed</dt>
          <dd className="font-mono text-[var(--color-ink)]">{workspace.elapsedMinutes}m</dd>
        </div>
        <div className="flex items-center justify-between py-1">
          <dt className="text-[var(--color-ink-muted)]">Validation</dt>
          <dd className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
            {validationLabel}
          </dd>
        </div>
      </dl>

      <div
        className={`mt-4 flex-1 rounded-lg border px-3 py-2 font-mono text-xs ${isDanger
            ? "border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5 text-[var(--color-danger)]"
            : isWarning
              ? "border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 text-[var(--color-warning)]"
              : isValidating
                ? "border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 text-[var(--color-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]"
          }`}
      >
        <span className={isDanger ? "mr-1" : isWarning ? "mr-1" : "mr-1 text-[var(--color-primary)]"}>
          {isDanger ? "✕" : isWarning ? "⚠" : isValidating ? "~" : "→"}
        </span>{" "}
        <span className="whitespace-pre-wrap leading-relaxed">{workspace.lastAction}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/workspaces/${workspace.id}`}
          className={`flex-1 rounded-lg py-2 text-center font-mono text-xs font-semibold transition-all ${isDanger
              ? "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-ink)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
              : isWarning
                ? "bg-[var(--color-warning)] text-[var(--color-canvas)] hover:opacity-90"
                : "bg-[var(--color-primary)] text-[var(--color-canvas)] hover:bg-[var(--color-primary-dim)]"
            }`}
        >
          {isDanger ? "Inspect" : isWarning ? "Review" : "Open"}
        </Link>
        <Link
          href={secondaryHref}
          target={hasLivePreview ? "_blank" : undefined}
          className={`flex items-center justify-center rounded-lg border px-3 py-2 transition-colors ${isDanger
              ? "border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20"
              : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            }`}
          title={hasLivePreview ? "Open preview in new tab" : `Open ${secondaryLabel.toLowerCase()} surface`}
        >
          {isDanger ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : isWarning ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
        </Link>
      </div>
    </article>
  );
}
