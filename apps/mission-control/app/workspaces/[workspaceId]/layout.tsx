import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceDetailHeader } from "@/features/workspaces/components/workspace-detail-header";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs";
import { getWorkspace } from "@/features/workspaces/data/workspace-detail-data";

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{
    workspaceId: string;
  }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);

  if (!workspace) {
    notFound();
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: "Mission Control", href: "/" },
        { label: "Workspaces", href: "/" },
        { label: workspace.slug },
      ]}
    >
      <div className="mx-auto w-full max-w-6xl animate-in fade-in duration-300 px-4 pt-4 lg:px-6">
        <WorkspaceDetailHeader workspace={workspace} />
        <WorkspaceTabs workspaceId={workspace.id} />
        {children}
      </div>
    </AppShell>
  );
}
