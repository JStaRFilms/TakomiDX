"use client";

import { useState } from "react";
import type { WorkspaceSummary } from "@takomi/contracts";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { EmptyState } from "@/components/ui/empty-state";

interface WorkspaceGridProps {
  initialWorkspaces: WorkspaceSummary[];
}

type FilterStatus = "all" | "active" | "waiting" | "done" | "failed";

const GROUPS = [
  {
    key: "attention",
    title: "Attention Queue",
    matches: (workspace: WorkspaceSummary) =>
      workspace.status === "awaiting_human" || workspace.status === "failed",
  },
  {
    key: "running",
    title: "Active Runs",
    matches: (workspace: WorkspaceSummary) =>
      ["queued", "booting", "running", "validating"].includes(workspace.status),
  },
  {
    key: "completed",
    title: "Completed",
    matches: (workspace: WorkspaceSummary) =>
      workspace.status === "completed" || workspace.status === "archived",
  },
] as const;

export function WorkspaceGrid({ initialWorkspaces }: WorkspaceGridProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");

  const filteredWorkspaces = initialWorkspaces.filter((workspace) => {
    switch (filter) {
      case "active":
        return ["running", "booting", "validating"].includes(workspace.status);
      case "waiting":
        return workspace.status === "awaiting_human" || workspace.status === "queued";
      case "done":
        return workspace.status === "completed" || workspace.status === "archived";
      case "failed":
        return workspace.status === "failed";
      default:
        return true;
    }
  });

  const groupedWorkspaces = GROUPS.map((group) => ({
    ...group,
    workspaces: filteredWorkspaces.filter(group.matches),
  })).filter((group) => group.workspaces.length > 0);

  const counts = {
    active: initialWorkspaces.filter((workspace) =>
      ["queued", "booting", "running", "validating"].includes(workspace.status),
    ).length,
    attention: initialWorkspaces.filter(
      (workspace) => workspace.status === "awaiting_human" || workspace.status === "failed",
    ).length,
    complete: initialWorkspaces.filter(
      (workspace) => workspace.status === "completed" || workspace.status === "archived",
    ).length,
  };

  const getFilterClass = (status: FilterStatus) => {
    const base =
      "cursor-pointer rounded-md px-3 py-1.5 font-mono text-xs transition-colors";
    if (filter === status) {
      return `${base} bg-[var(--color-primary)]/10 text-[var(--color-primary)]`;
    }
    return `${base} text-[var(--color-ink-muted)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-ink-faint)]">
            active {counts.active}
          </span>
          <span className="rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/6 px-2.5 py-1 text-[var(--color-warning)]">
            needs decision {counts.attention}
          </span>
          <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-ink-faint)]">
            completed {counts.complete}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setFilter("all")} className={getFilterClass("all")}>
              All
            </button>
            <button onClick={() => setFilter("active")} className={getFilterClass("active")}>
              Active
            </button>
            <button onClick={() => setFilter("waiting")} className={getFilterClass("waiting")}>
              Waiting
            </button>
            <button onClick={() => setFilter("failed")} className={getFilterClass("failed")}>
              Failed
            </button>
            <button onClick={() => setFilter("done")} className={getFilterClass("done")}>
              Done
            </button>
          </div>

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-ink-faint)]">
            {filteredWorkspaces.length} visible
          </div>
        </div>
      </div>

      {filteredWorkspaces.length > 0 ? (
        <div className="space-y-5">
          {groupedWorkspaces.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  {group.title}
                </h2>
                <div className="font-mono text-[11px] text-[var(--color-ink-faint)]">
                  {group.workspaces.length}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.workspaces.map((workspace) => (
                  <WorkspaceCard key={workspace.id} workspace={workspace} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="&gt;_"
          title="No workspaces in this view"
          description="No workspace capsules match the current filter."
        />
      )}
    </div>
  );
}
