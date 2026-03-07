import { notFound } from "next/navigation";
import { getWorkspaceDetail } from "@/features/workspaces/data/workspace-detail-data";

export default async function WorkspaceValidationPage({
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
          <p className="mt-3 text-sm leading-6 text-[var(--color-ink-muted)]">{item.detail}</p>
        </section>
      ))}
    </div>
  );
}
