import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceBackendUnavailablePanel } from "@/features/workspaces/components/workspace-backend-unavailable";
import { getWorkspaceDetail } from "@/features/workspaces/data/workspace-detail-data";
import { isAgentdConnectionError } from "@/lib/agentd-server";

export default async function WorkspaceDiffPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  try {
    const detail = await getWorkspaceDetail(workspaceId);

    if (!detail) {
      notFound();
    }

    if (detail.diff.length === 0) {
      return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <EmptyState
            icon="+/-"
            title="No File Changes Detected"
            description="The workspace has not produced a diff bundle yet."
          />
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Diff
          </h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {detail.diff.map((item) => (
            <div key={item.path} className="grid gap-3 px-4 py-4 md:grid-cols-[110px_1fr]">
              <div className="font-mono text-xs uppercase text-[var(--color-ink-faint)]">{item.change}</div>
              <div>
                <div className="font-mono text-sm text-[var(--color-ink)]">{item.path}</div>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    if (!isAgentdConnectionError(error)) {
      throw error;
    }

    return <WorkspaceBackendUnavailablePanel workspaceId={workspaceId} area="workspace diff" />;
  }
}
