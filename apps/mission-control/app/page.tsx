import { AppShell } from "@/components/layout/app-shell";
import { CreateWorkspacePanel } from "@/features/workspaces/components/create-workspace-panel";
import { WorkspaceGrid } from "@/features/workspaces/components/workspace-grid";
import { loadWorkspaceList } from "@/features/workspaces/data/workspace-detail-data";
import { resolveMissionControlEnv } from "@/lib/env";

export default async function HomePage() {
  const env = resolveMissionControlEnv();
  const { workspaces, errorMessage } = await loadWorkspaceList();

  return (
    <AppShell>
      <div className="space-y-6 pt-6">
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
          <header className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="font-mono text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
                Local Tracking
              </h1>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Supervise attached runs and managed workspaces across your environment.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 font-mono text-[11px] text-[var(--color-ink-faint)]">
                backend
              </span>
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 font-mono text-xs text-[var(--color-accent)]">
                {env.shared.TAKOMI_RUNTIME_BACKEND}
              </span>
            </div>
          </header>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
          <CreateWorkspacePanel />
        </div>

        {errorMessage && (
          <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
            <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 px-4 py-3 text-sm text-[var(--color-ink)]">
              Mission Control could not load live workspace data from agentd.
              <span className="ml-1 text-[var(--color-ink-muted)]">{errorMessage}</span>
            </div>
          </div>
        )}

        <section>
          <WorkspaceGrid initialWorkspaces={workspaces} />
        </section>
      </div>
    </AppShell>
  );
}
