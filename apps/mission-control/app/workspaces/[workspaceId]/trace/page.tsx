import { getWorkspaceDetail } from "@/features/workspaces/data/workspace-detail-data";
import { notFound } from "next/navigation";

export default async function WorkspaceTracePage({
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
          Trace
        </h2>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {detail.trace.map((item) => (
          <div key={item.span} className="grid gap-3 px-4 py-4 md:grid-cols-[140px_1fr_90px_80px] md:items-start">
            <div className="font-mono text-xs text-[var(--color-ink-faint)]">{item.span}</div>
            <div>
              <div className="font-mono text-sm text-[var(--color-ink)]">{item.tool}</div>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{item.summary}</p>
            </div>
            <div
              className={`font-mono text-xs uppercase ${
                item.status === "failed"
                  ? "text-[var(--color-danger)]"
                  : item.status === "warn"
                    ? "text-[var(--color-warning)]"
                    : item.status === "running"
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-success)]"
              }`}
            >
              {item.status}
            </div>
            <div className="font-mono text-xs text-[var(--color-ink-faint)]">{item.duration}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
