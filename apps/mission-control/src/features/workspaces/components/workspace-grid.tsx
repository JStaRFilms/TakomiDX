"use client";

import { useState } from "react";
import type { WorkspaceSummary } from "@takomi/contracts";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { EmptyState } from "@/components/ui/empty-state";

interface WorkspaceGridProps {
  initialWorkspaces: WorkspaceSummary[];
}

type FilterStatus = "all" | "active" | "attention" | "waiting" | "done" | "failed";
type ModeFilter = "all" | "managed" | "attached";

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

function matchesFilter(workspace: WorkspaceSummary, filter: FilterStatus) {
  switch (filter) {
    case "active":
      return ["running", "booting", "validating"].includes(workspace.status);
    case "attention":
      return workspace.status === "awaiting_human" || workspace.status === "failed";
    case "waiting":
      return workspace.status === "awaiting_human" || workspace.status === "queued";
    case "done":
      return workspace.status === "completed" || workspace.status === "archived";
    case "failed":
      return workspace.status === "failed";
    default:
      return true;
  }
}

export function WorkspaceGrid({ initialWorkspaces }: WorkspaceGridProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");

  const filteredWorkspaces = initialWorkspaces.filter((workspace) => {
    const matchesStatus = matchesFilter(workspace, filter);
    const matchesMode = modeFilter === "all" || workspace.mode === modeFilter;
    return matchesStatus && matchesMode;
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

  const getModeFilterClass = (mode: ModeFilter) => {
    const base =
      "cursor-pointer rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors";
    if (modeFilter === mode) {
      return `${base} bg-[var(--color-primary)] text-[var(--color-canvas)]`;
    }
    return `${base} border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]`;
  };

  const getSummaryClass = (status: Extract<FilterStatus, "active" | "attention" | "done">) => {
    const base =
      "cursor-pointer rounded-md border px-2.5 py-1 font-mono text-xs transition-colors";
    if (status === "attention") {
      return filter === "attention"
        ? `${base} border-[var(--color-warning)]/40 bg-[var(--color-warning)]/12 text-[var(--color-warning)]`
        : `${base} border-[var(--color-warning)]/30 bg-[var(--color-warning)]/6 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10`;
    }
    const color =
      status === "active" && filter === "active"
        ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
        : status === "done" && filter === "done"
          ? "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-ink-faint)] hover:text-[var(--color-ink-muted)]";
    return `${base} ${color}`;
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-[57px] z-30 mx-auto w-full max-w-6xl bg-[var(--color-canvas)]/80 px-4 py-2 backdrop-blur-md lg:px-6">
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-3 shadow-md">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setFilter("active")} className={getSummaryClass("active")}>
              active {counts.active}
            </button>
            <button
              onClick={() => setFilter("attention")}
              className={getSummaryClass("attention")}
            >
              needs decision {counts.attention}
            </button>
            <button onClick={() => setFilter("done")} className={getSummaryClass("done")}>
              completed {counts.complete}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setFilter("all")} className={getFilterClass("all")}>
                All
              </button>
              <button onClick={() => setFilter("active")} className={getFilterClass("active")}>
                Active
              </button>
              <button
                onClick={() => setFilter("attention")}
                className={getFilterClass("attention")}
              >
                Needs decision
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

            <div className="flex items-center gap-1.5 border-l border-[var(--color-border)] pl-3">
              <button
                onClick={() => setModeFilter("all")}
                className={getModeFilterClass("all")}
              >
                All
              </button>
              <button
                onClick={() => setModeFilter("managed")}
                className={getModeFilterClass("managed")}
              >
                Managed
              </button>
              <button
                onClick={() => setModeFilter("attached")}
                className={getModeFilterClass("attached")}
              >
                Attached
              </button>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-ink-faint)]">
              {filteredWorkspaces.length} visible
            </div>
          </div>
        </div>
      </div>

      {filteredWorkspaces.length > 0 ? (
        <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 lg:px-8">
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
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
          <EmptyState
            icon=">_"
            title="No workspaces in this view"
            description="No workspace capsules match the current filter."
          />
        </div>
      )}
    </div>
  );
}
