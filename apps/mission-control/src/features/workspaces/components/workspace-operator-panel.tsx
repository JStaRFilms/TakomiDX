"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceRuntimeState, WorkspaceSummary } from "@takomi/contracts";
import {
  deriveRuntimeWorkspaceStatus,
  isWorkspacePreviewLive,
  isWorkspacePreviewUsingFallback,
} from "@/features/workspaces/data/workspace-detail-data";

interface WorkspaceOperatorPanelProps {
  workspace: WorkspaceSummary;
  runtime: WorkspaceRuntimeState | null;
}

interface ApiErrorResponse {
  message?: string;
}

interface RuntimeLogsResponse {
  workspaceId: string;
  containerName: string | null;
  lifecycle: WorkspaceRuntimeState["lifecycle"];
  tail: number;
  logs: string;
}

async function requestJson<T>(
  pathname: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(pathname, init);

  // Handle empty responses gracefully to prevent "Unexpected end of JSON input"
  const text = await response.text();
  if (!text.trim()) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return undefined as T;
  }

  const payload = JSON.parse(text) as T & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}

async function postJson(pathname: string, body: unknown) {
  await requestJson(pathname, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function scheduleRefreshBurst(router: ReturnType<typeof useRouter>) {
  const delaysMs = [1500, 4000, 8000, 15000];

  for (const delayMs of delaysMs) {
    window.setTimeout(() => {
      router.refresh();
    }, delayMs);
  }
}

export function WorkspaceOperatorPanel({
  workspace,
  runtime,
}: WorkspaceOperatorPanelProps) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentType, setAgentType] = useState("Operator session");
  const [budgetUsd, setBudgetUsd] = useState("5");
  const [runtimeImage, setRuntimeImage] = useState("node:22-alpine");
  const [runtimeCommand, setRuntimeCommand] = useState(
    'sh -lc "corepack enable && pnpm install && pnpm dev --hostname 0.0.0.0 --port 3000"',
  );
  const [containerPort, setContainerPort] = useState("3000");
  const [healthCheckPath, setHealthCheckPath] = useState("/");
  const [liveRuntime, setLiveRuntime] = useState<WorkspaceRuntimeState | null>(runtime);
  const [runtimeLogs, setRuntimeLogs] = useState("");
  const [isPollingRuntime, setIsPollingRuntime] = useState(false);
  const [runtimeMonitorError, setRuntimeMonitorError] = useState<string | null>(null);
  const [lastRuntimeRefreshAt, setLastRuntimeRefreshAt] = useState<string | null>(null);

  useEffect(() => {
    setLiveRuntime(runtime);
  }, [runtime]);

  const activeRuntime = liveRuntime ?? runtime;
  const isManaged = workspace.mode !== "attached";
  const canStartRun = isManaged && !workspace.activeRunId;
  const runtimeStatus = deriveRuntimeWorkspaceStatus(activeRuntime);
  const isLivePreviewHost = isWorkspacePreviewLive(activeRuntime);
  const isFallbackPreview = isWorkspacePreviewUsingFallback(activeRuntime);
  const canStartRuntime =
    isManaged &&
    !isBusy &&
    (!activeRuntime ||
      activeRuntime.lifecycle === "failed" ||
      activeRuntime.lifecycle === "stopped");

  // Validation can only run when runtime is ready (running and healthy)
  const canRunValidation =
    !isBusy &&
    activeRuntime !== null &&
    runtimeStatus === "running" &&
    activeRuntime.healthStatus === "healthy";
  const validationDisabledReason = !activeRuntime
    ? "Runtime is not started"
    : runtimeStatus !== "running"
      ? `Runtime is ${runtimeStatus}, not ready`
      : activeRuntime.healthStatus !== "healthy"
        ? `Runtime health is ${activeRuntime.healthStatus}`
        : null;

  const runtimeActionLabel =
    activeRuntime?.lifecycle === "running"
      ? "Runtime Active"
      : activeRuntime?.lifecycle === "booting"
        ? "Runtime Booting"
        : activeRuntime?.lifecycle === "stopped"
          ? "Restart Runtime"
          : "Start Runtime";

  useEffect(() => {
    if (!activeRuntime) {
      setRuntimeLogs("");
      setRuntimeMonitorError(null);
      setLastRuntimeRefreshAt(null);
      return;
    }

    if (runtimeStatus !== "booting" && runtimeStatus !== "running") {
      return;
    }

    const currentRuntime = activeRuntime;

    async function refreshRuntimeMonitor() {
      setIsPollingRuntime(true);

      try {
        const [refreshedRuntime, liveLogs] = await Promise.all([
          requestJson<WorkspaceRuntimeState>(
            `/api/workspaces/${workspace.id}/runtime/refresh-health`,
            {
              method: "POST",
            },
          ),
          requestJson<RuntimeLogsResponse>(
            `/api/workspaces/${workspace.id}/runtime/logs?tail=120`,
          ),
        ]);

        setLiveRuntime(refreshedRuntime);
        setRuntimeLogs(liveLogs.logs.trim());
        setRuntimeMonitorError(null);
        setLastRuntimeRefreshAt(
          new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).format(new Date()),
        );

        if (
          refreshedRuntime.lifecycle !== currentRuntime.lifecycle ||
          refreshedRuntime.healthStatus !== currentRuntime.healthStatus ||
          refreshedRuntime.lastError !== currentRuntime.lastError
        ) {
          startTransition(() => {
            router.refresh();
          });
        }
      } catch (monitorError) {
        setRuntimeMonitorError(
          monitorError instanceof Error
            ? monitorError.message
            : "Runtime polling failed.",
        );
      } finally {
        setIsPollingRuntime(false);
      }
    }

    void refreshRuntimeMonitor();
    const pollIntervalMs = runtimeStatus === "booting" ? 2500 : 8000;
    const intervalId = window.setInterval(() => {
      void refreshRuntimeMonitor();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeRuntime, router, runtimeStatus, workspace.id]);

  async function runAction(
    label: string,
    action: () => Promise<void>,
  ) {
    setIsBusy(true);
    setMessage(null);
    setError(null);

    try {
      await action();
      setMessage(
        label === "Start run"
          ? "Run started. This creates the observability session only; Docker boot and validation are separate actions."
          : label === "Start runtime"
            ? "Start runtime accepted. Polling container health and live logs now."
            : `${label} succeeded. Refreshing workspace state...`,
      );
      router.refresh();
      if (label === "Start runtime" || label === "Run validation") {
        scheduleRefreshBurst(router);
      }
      if (label === "Start runtime") {
        setRuntimeLogs("");
        setRuntimeMonitorError(null);
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : `${label} failed.`,
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Operator Controls
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
            {workspace.mode === "attached"
              ? "Attached workspaces are managed externally. Start the runtime and run using your local terminal, then use Mission Control for validation and review."
              : "Start a run, boot a preview runtime, and trigger browser validation without leaving Mission Control."}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
          Runtime needs Docker plus a reachable image pull on first boot.
          <span className="ml-1 font-mono text-[var(--color-ink)]">
            node:22-alpine
          </span>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`mt-4 rounded-lg border px-3 py-3 text-sm ${error
            ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/8 text-[var(--color-danger)]"
            : "border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 text-[var(--color-ink)]"
            }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Start Run
          </h3>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                Agent Label
              </span>
              <input
                value={agentType}
                onChange={(event) => setAgentType(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                Budget USD
              </span>
              <input
                value={budgetUsd}
                onChange={(event) => setBudgetUsd(event.target.value)}
                inputMode="decimal"
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </label>
            {canStartRun ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  runAction("Start run", () =>
                    postJson(`/api/workspaces/${workspace.id}/run`, {
                      agentType: agentType.trim() || "Operator session",
                      budgetUsd: Number(budgetUsd) || 5,
                    }),
                  )
                }
                className="w-full cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-2 font-mono text-sm font-semibold text-[var(--color-canvas)] transition-colors hover:bg-[var(--color-primary-dim)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start Run
              </button>
            ) : (
              <div className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-center font-mono text-sm text-[var(--color-ink-muted)]">
                {workspace.mode === "attached" ? "Attached (External)" : "Run Active"}
              </div>
            )}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)]">
              This creates the observability run record only. It does not boot Docker or open the
              preview by itself.
            </div>
            {workspace.activeRunId && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)]">
                Active run attached:
                <span className="ml-1 font-mono text-[var(--color-ink)]">
                  {workspace.activeRunId}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Boot Runtime
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                Command
              </span>
              <input
                value={runtimeCommand}
                onChange={(event) => setRuntimeCommand(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                Container Image
              </span>
              <input
                value={runtimeImage}
                onChange={(event) => setRuntimeImage(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                Container Port
              </span>
              <input
                value={containerPort}
                onChange={(event) => setContainerPort(event.target.value)}
                inputMode="numeric"
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                Health Check Path
              </span>
              <input
                value={healthCheckPath}
                onChange={(event) => setHealthCheckPath(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </label>
          </div>
          <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)]">
            Fresh worktrees need an install step. For Next.js use:
            <span className="ml-1 font-mono text-[var(--color-ink)]">
              sh -lc "corepack enable && pnpm install && pnpm dev --hostname 0.0.0.0 --port 3000"
            </span>
            . For Vite use:
            <span className="ml-1 font-mono text-[var(--color-ink)]">
              sh -lc "corepack enable && pnpm install && pnpm dev --host 0.0.0.0 --port 5173"
            </span>
            .
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canStartRuntime}
              onClick={() =>
                runAction("Start runtime", () =>
                  postJson(`/api/workspaces/${workspace.id}/runtime`, {
                    image: runtimeImage.trim() || "node:22-alpine",
                    command: runtimeCommand.trim(),
                    containerPort: Number(containerPort) || 3000,
                    healthCheckPath: healthCheckPath.trim() || "/",
                  }),
                )
              }
              className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-2 font-mono text-sm font-semibold text-[var(--color-canvas)] transition-colors hover:bg-[var(--color-primary-dim)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runtimeActionLabel}
            </button>
            <button
              type="button"
              disabled={!canRunValidation}
              onClick={() =>
                runAction("Run validation", () =>
                  postJson(`/api/workspaces/${workspace.id}/validation`, {}),
                )
              }
              className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-mono text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
              title={validationDisabledReason ?? "Run browser validation"}
            >
              {canRunValidation ? "Run Validation" : "Validation Unavailable"}
            </button>
          </div>
        </section>
      </div>

      {activeRuntime && (
        <section className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Live Runtime Feed
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
                {runtimeStatus === "booting"
                  ? "Polling Docker health and app readiness. The preview URL only becomes usable after the app starts answering health checks."
                  : "Runtime is answering health checks. Polling continues so header state and preview details stay fresh."}
              </p>
            </div>
            <div className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
              {isPollingRuntime
                ? "Polling live"
                : lastRuntimeRefreshAt
                  ? `Last refresh ${lastRuntimeRefreshAt}`
                  : "Waiting for runtime updates"}
            </div>
          </div>

          {activeRuntime.preview && !isLivePreviewHost && (
            <div className="mt-3 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)]">
              {isFallbackPreview
                ? "TakomiDX knows the route target, but the local edge proxy is unavailable. Keep using the fallback port URL and free port 80 on this machine if another process is occupying it."
                : "The local edge proxy is up, but this workspace host is not live yet. TakomiDX will keep polling runtime and route health until the custom host is ready."}
            </div>
          )}

          {isLivePreviewHost && (
            <div className="mt-3 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)]">
              Preview host is live at
              <span className="ml-1 font-mono text-[var(--color-ink)]">
                {activeRuntime.preview?.url}
              </span>
              . Fallback ports remain available only as a proxy-outage escape hatch.
            </div>
          )}

          {(activeRuntime.lastError || runtimeMonitorError) && (
            <div className="mt-3 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)]">
              Latest probe:
              <span className="ml-1 text-[var(--color-ink)]">
                {runtimeMonitorError ?? activeRuntime.lastError}
              </span>
            </div>
          )}

          <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-3">
            {runtimeLogs ? (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-[var(--color-ink-muted)]">
                {runtimeLogs}
              </pre>
            ) : (
              <p className="font-mono text-xs leading-6 text-[var(--color-ink-faint)]">
                Waiting for container logs. On a cold boot this usually means Docker is still
                pulling the image, pnpm is still installing, or the app has not started listening
                on the configured port yet.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Workspace Lifecycle Section - Archive/Delete controls */}
      <section className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
          Workspace Lifecycle
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
          Archive a workspace to clean up resources while preserving metadata. Delete an archived workspace to remove it entirely.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {workspace.status !== "archived" ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                runAction("Archive workspace", () =>
                  postJson(`/api/workspaces/${workspace.id}/archive`, {})
                )
              }
              className="cursor-pointer rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-2 font-mono text-sm text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning)]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Archive Workspace
            </button>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                const confirmDelete = window.confirm(
                  "Are you sure you want to delete this archived workspace? This action cannot be undone.",
                );
                if (confirmDelete) {
                  runAction("Delete workspace", () =>
                    postJson(`/api/workspaces/${workspace.id}/delete`, {
                      confirm: true,
                      deleteBranch: true,
                    })
                  );
                }
              }}
              className="cursor-pointer rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-2 font-mono text-sm text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete Workspace
            </button>
          )}
        </div>
        {workspace.status === "archived" && (
          <div className="mt-3 rounded-lg border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/8 px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)]">
            This workspace is archived. You can delete it to remove all local data, or leave it archived.
          </div>
        )}
      </section>
    </div>
  );
}
