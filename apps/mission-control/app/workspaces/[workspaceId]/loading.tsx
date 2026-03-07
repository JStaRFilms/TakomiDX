import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <AppShell breadcrumbs={[{ label: "Mission Control", href: "/" }, { label: "Workspaces" }, { label: "Loading" }]}>
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pt-4 lg:px-6">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-52" />
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-7 w-36" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-b border-[var(--color-border)] pb-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </AppShell>
  );
}
