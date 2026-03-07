import type { WorkspaceSummary } from "@takomi/contracts";
import Link from "next/link";

const statusTone: Record<WorkspaceSummary["status"], string> = {
  archived: "text-black/60",
  awaiting_human: "text-[color:var(--color-warning)]",
  booting: "text-blue-700",
  completed: "text-[color:var(--color-success)]",
  failed: "text-[color:var(--color-danger)]",
  queued: "text-black/60",
  running: "text-[color:var(--color-success)]",
  validating: "text-blue-700",
};

interface WorkspaceCardProps {
  workspace: WorkspaceSummary;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  return (
    <article className="rounded-[28px] border border-[color:var(--color-line)] bg-[color:var(--color-panel)] p-5 shadow-[8px_8px_0_0_var(--color-line)] transition-transform duration-150 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-black/60">
            {workspace.repoName}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            {workspace.slug}
          </h2>
        </div>
        <span className={`text-sm font-semibold uppercase ${statusTone[workspace.status]}`}>
          {workspace.status.replace("_", " ")}
        </span>
      </div>
      <dl className="mt-5 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-black/60">Branch</dt>
          <dd className="font-medium">{workspace.branch}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-black/60">Agent</dt>
          <dd className="font-medium">{workspace.agentType}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-black/60">Preview</dt>
          <dd className="font-medium">{workspace.previewHost}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-black/60">Cost</dt>
          <dd className="font-medium">${workspace.tokenCostUsd.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-black/60">Elapsed</dt>
          <dd className="font-medium">{workspace.elapsedMinutes}m</dd>
        </div>
      </dl>
      <p className="mt-5 rounded-2xl bg-[color:var(--color-panel-strong)] px-4 py-3 text-sm">
        {workspace.lastAction}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
          href={`/workspaces/${workspace.id}`}
        >
          Open Detail
        </Link>
        <span className="rounded-full border border-dashed border-[color:var(--color-line)] px-4 py-2 text-sm text-black/60">
          Health: {workspace.health}
        </span>
      </div>
    </article>
  );
}
