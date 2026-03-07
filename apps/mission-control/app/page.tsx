import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderPanel } from "@/components/panels/placeholder-panel";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { sampleWorkspaces } from "@/features/workspaces/data/sample-workspaces";
import { resolveMissionControlEnv } from "@/lib/env";

export default function HomePage() {
  const env = resolveMissionControlEnv();

  return (
    <AppShell
      eyebrow="Mission Control"
      title="Supervise workspace capsules, not terminal tabs."
      description="This MVP shell locks the routes, layout, and naming conventions for TakomiDX. Live orchestration arrives in downstream tasks."
      aside={
        <div className="rounded-[28px] border border-[color:var(--color-line)] bg-[color:var(--color-panel)] p-5 shadow-[8px_8px_0_0_var(--color-line)]">
          <p className="text-xs uppercase tracking-[0.24em] text-black/60">
            Active MVP decisions
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-black/60">Mission Control</dt>
              <dd className="font-semibold">Web-first</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-black/60">Runtime backend</dt>
              <dd className="font-semibold uppercase">
                {env.shared.TAKOMI_RUNTIME_BACKEND}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-black/60">Editor target</dt>
              <dd className="font-semibold uppercase">
                {env.shared.TAKOMI_EDITOR_TARGET}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-black/60">Preview domain</dt>
              <dd className="font-semibold">
                {env.public.NEXT_PUBLIC_TAKOMI_PREVIEW_DOMAIN}
              </dd>
            </div>
          </dl>
        </div>
      }
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {sampleWorkspaces.map((workspace) => (
          <WorkspaceCard key={workspace.id} workspace={workspace} />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <PlaceholderPanel
          title="Workspace Activity Feed"
          description="Reserved for semantic events from agentd and downstream observability tasks."
          items={[
            "Branch and preview registration events",
            "Validation and review bundle milestones",
            "Approval requests and loop detection notices",
          ]}
        />
        <PlaceholderPanel
          title="Review Queue"
          description="Reserved for screenshots, diff summaries, and validation outcomes."
          items={[
            "Preview launch checklist",
            "Console and network regression summary",
            "Approval and archival disposition",
          ]}
        />
      </section>
    </AppShell>
  );
}
