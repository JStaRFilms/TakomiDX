import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceGrid } from "@/features/workspaces/components/workspace-grid";
import { sampleWorkspaces } from "@/features/workspaces/data/sample-workspaces";
import { resolveMissionControlEnv } from "@/lib/env";

export default function HomePage() {
  const env = resolveMissionControlEnv();

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="font-mono text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
              Workspace Grid
            </h1>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Supervise active workspace capsules without terminal hunting.
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

        <section>
          <WorkspaceGrid initialWorkspaces={sampleWorkspaces} />
        </section>
      </div>
    </AppShell>
  );
}
