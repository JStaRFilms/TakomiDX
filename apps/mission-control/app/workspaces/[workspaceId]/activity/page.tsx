import { notFound } from "next/navigation";
import { getWorkspaceDetail } from "@/features/workspaces/data/workspace-detail-data";

export default async function WorkspaceActivityPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const detail = getWorkspaceDetail(workspaceId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Activity
        </h2>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {detail.activity.map((item) => (
          <div key={`${item.timestamp}-${item.title}`} className="grid gap-3 px-4 py-4 md:grid-cols-[72px_90px_1fr]">
            <div className="font-mono text-xs text-[var(--color-ink-faint)]">{item.timestamp}</div>
            <div className="font-mono text-xs uppercase text-[var(--color-ink-faint)]">{item.kind}</div>
            <div>
              <div className="font-mono text-sm text-[var(--color-ink)]">{item.title}</div>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
