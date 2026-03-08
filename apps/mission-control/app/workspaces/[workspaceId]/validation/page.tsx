import { notFound } from "next/navigation";
import { WorkspaceBackendUnavailablePanel } from "@/features/workspaces/components/workspace-backend-unavailable";
import { getWorkspaceDetail } from "@/features/workspaces/data/workspace-detail-data";
import { isAgentdConnectionError } from "@/lib/agentd-server";

export default async function WorkspaceValidationPage({
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

    return (
      <div className="space-y-4">
        {!detail.reviewBundle && detail.validation.length === 0 && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <h2 className="font-mono text-lg text-[var(--color-ink)]">No Validation Run Yet</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-ink-muted)]">
                Start the workspace runtime and run validation from the Operator Controls panel to generate a review bundle.
              </p>
            </div>
          </section>
        )}

        {detail.reviewBundle && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-mono text-sm text-[var(--color-ink)]">Latest Review Bundle</h2>
              <span
                className={`font-mono text-[11px] uppercase ${detail.reviewBundle.validationStatus === "passed"
                  ? "text-[var(--color-success)]"
                  : detail.reviewBundle.validationStatus === "failed"
                    ? "text-[var(--color-danger)]"
                    : "text-[var(--color-warning)]"
                  }`}
              >
                {detail.reviewBundle.validationStatus}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-ink)]">
              {detail.reviewBundle.testSummary}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
              {detail.reviewBundle.recommendedAction}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <div className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                  Preview URL
                </div>
                <p className="mt-2 break-all font-mono text-xs text-[var(--color-accent)]">
                  {detail.reviewBundle.previewUrl}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                <div className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                  Artifacts
                </div>
                <div className="mt-2 space-y-2">
                  {detail.reviewBundle.artifacts.map((artifact) => (
                    <div
                      key={`${artifact.kind}-${artifact.path}`}
                      className="rounded-md border border-[var(--color-border)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-[var(--color-ink)]">
                          {artifact.label}
                        </span>
                        <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                          {artifact.kind}
                        </span>
                      </div>
                      <p className="mt-2 break-all font-mono text-[11px] text-[var(--color-ink-muted)]">
                        {artifact.path}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <div className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                Diagnostics
              </div>
              <div className="mt-2 space-y-2">
                {detail.reviewBundle.diagnostics.map((item) => (
                  <p key={item} className="text-sm text-[var(--color-ink-muted)]">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {detail.validation.map((item) => (
            <section
              key={item.label}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-mono text-sm text-[var(--color-ink)]">{item.label}</h2>
                <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--color-ink-muted)]">
                {item.detail}
              </p>
            </section>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    if (!isAgentdConnectionError(error)) {
      throw error;
    }

    return <WorkspaceBackendUnavailablePanel workspaceId={workspaceId} area="validation results" />;
  }
}
