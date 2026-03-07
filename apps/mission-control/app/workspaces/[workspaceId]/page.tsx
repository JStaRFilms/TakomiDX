import { notFound } from "next/navigation";
import { getWorkspace, getWorkspaceDetail } from "@/features/workspaces/data/workspace-detail-data";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);
  const detail = await getWorkspaceDetail(workspaceId);

  if (!workspace || !detail) {
    notFound();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-4">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Current Action
            </h2>
            <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{workspace.agentType}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--color-ink)]">{detail.currentAction}</p>
          <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-xs text-[var(--color-ink-muted)]">
            &gt; {workspace.lastAction}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Next Action
          </h2>
          <p className="mt-3 font-mono text-sm text-[var(--color-ink)]">{detail.nextAction}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">{detail.nextActionDetail}</p>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Mission
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-ink-muted)]">{detail.mission}</p>
        </section>
      </div>

      <div className="space-y-4">
        {(detail.approvalPrompt || detail.failurePrompt) && (
          <section
            className={`rounded-xl border p-4 ${
              detail.failurePrompt
                ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/6"
                : "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/6"
            }`}
          >
            <h2
              className={`font-mono text-xs uppercase tracking-[0.2em] ${
                detail.failurePrompt ? "text-[var(--color-danger)]" : "text-[var(--color-warning)]"
              }`}
            >
              {detail.failurePrompt ? "Failure State" : "Awaiting Approval"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-ink)]">
              {detail.failurePrompt ?? detail.approvalPrompt}
            </p>
          </section>
        )}

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Operator Note
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-ink-muted)]">{detail.operatorNote}</p>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Validation Snapshot
          </h2>
          <div className="mt-3 space-y-2">
            {detail.validation.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-[var(--color-ink)]">{item.label}</span>
                  <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {detail.reviewBundle && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
                Review Bundle
              </h2>
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
            <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3">
              <div className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
                Preview URL
              </div>
              <p className="mt-2 break-all font-mono text-xs text-[var(--color-accent)]">
                {detail.reviewBundle.previewUrl}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
