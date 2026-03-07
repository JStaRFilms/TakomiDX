import { notFound } from "next/navigation";
import { getWorkspaceDetail } from "@/features/workspaces/data/workspace-detail-data";

export default async function WorkspaceValidationPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const detail = await getWorkspaceDetail(workspaceId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-4">
      {detail.reviewBundle && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-sm text-[var(--color-ink)]">Latest Review Bundle</h2>
            <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
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
}
