import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceBackendUnavailablePanel } from "@/features/workspaces/components/workspace-backend-unavailable";
import {
  getWorkspace,
  getWorkspaceDetail,
  getWorkspaceRuntime,
  resolveWorkspacePreviewUrl,
} from "@/features/workspaces/data/workspace-detail-data";
import { isAgentdConnectionError } from "@/lib/agentd-server";

export default async function WorkspacePreviewPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  try {
    const [workspace, detail, runtime] = await Promise.all([
      getWorkspace(workspaceId),
      getWorkspaceDetail(workspaceId),
      getWorkspaceRuntime(workspaceId),
    ]);

    if (!workspace || !detail) {
      notFound();
    }

    const isLive = detail.previewState === "live" || detail.previewState === "warming";
    const previewHref = resolveWorkspacePreviewUrl(workspace, runtime);
    const isUsingFallbackPreview =
      Boolean(runtime?.preview?.manualFallbackUrl) && runtime?.preview?.routeStatus !== "registered";

    if (!isLive) {
      return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <EmptyState
            icon="[]"
            title="Preview Offline"
            description={`Workspace is currently ${workspace.status.replace("_", " ")}. Preview access returns when the runtime is active again.`}
          />
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
          <div className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-1 font-mono text-xs text-[var(--color-ink-muted)]">
            {previewHref}
          </div>
          <Link
            href={previewHref}
            target="_blank"
            className="font-mono text-xs text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
          >
            {isUsingFallbackPreview ? "open local preview" : "open"}
          </Link>
        </div>
        <div className="flex min-h-[520px] items-center justify-center bg-[var(--color-canvas)] p-8">
          <div className="max-w-md space-y-3 text-center">
            <p className="font-mono text-sm text-[var(--color-ink)]">
              {detail.previewState === "warming" ? "Preview warming up" : "Preview ready for supervised review"}
            </p>
            {isUsingFallbackPreview && (
              <p className="text-sm leading-6 text-[var(--color-accent)]">
                Local fallback preview is active while the host route is still degraded.
              </p>
            )}
            <p className="text-sm leading-6 text-[var(--color-ink-muted)]">
              {detail.nextActionDetail}
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    if (!isAgentdConnectionError(error)) {
      throw error;
    }

    return <WorkspaceBackendUnavailablePanel workspaceId={workspaceId} area="preview data" />;
  }
}
