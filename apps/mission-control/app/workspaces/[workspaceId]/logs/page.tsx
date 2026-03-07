import { notFound } from "next/navigation";
import { getWorkspaceDetail } from "@/features/workspaces/data/workspace-detail-data";

export default async function WorkspaceLogsPage({
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
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Logs
        </h2>
      </div>
      <div className="bg-[var(--color-canvas)] px-4 py-3 font-mono text-xs">
        {detail.logs.map((item) => (
          <div key={`${item.timestamp}-${item.line}`} className="grid gap-3 border-b border-[var(--color-border)]/40 py-2 last:border-b-0 md:grid-cols-[88px_72px_1fr]">
            <span className="text-[var(--color-ink-faint)]">{item.timestamp}</span>
            <span
              className={`uppercase ${
                item.stream === "stderr"
                  ? "text-[var(--color-danger)]"
                  : item.stream === "system"
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-primary)]"
              }`}
            >
              {item.stream}
            </span>
            <span className="text-[var(--color-ink-muted)]">{item.line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
