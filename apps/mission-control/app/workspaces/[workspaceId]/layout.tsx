import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceUnavailableHeader } from "@/features/workspaces/components/workspace-backend-unavailable";
import { WorkspaceDetailHeader } from "@/features/workspaces/components/workspace-detail-header";
import { WorkspaceTabs } from "@/features/workspaces/components/workspace-tabs";
import { getWorkspace, getWorkspaceRuntime } from "@/features/workspaces/data/workspace-detail-data";
import { isAgentdConnectionError } from "@/lib/agentd-server";

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
  try {
    const [workspace, runtime] = await Promise.all([
      getWorkspace(workspaceId),
      getWorkspaceRuntime(workspaceId),
    ]);

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
          <WorkspaceDetailHeader workspace={workspace} runtime={runtime} />
          <WorkspaceTabs workspaceId={workspace.id} />
          {children}
        </div>
      </AppShell>
    );
  } catch (error) {
    if (!isAgentdConnectionError(error)) {
      throw error;
    }

    return (
      <AppShell
        breadcrumbs={[
          { label: "Mission Control", href: "/" },
          { label: "Workspaces", href: "/" },
          { label: workspaceId },
        ]}
      >
        <div className="mx-auto w-full max-w-6xl animate-in fade-in duration-300 px-4 pt-4 lg:px-6">
          <WorkspaceUnavailableHeader workspaceId={workspaceId} />
          <WorkspaceTabs workspaceId={workspaceId} />
          {children}
        </div>
      </AppShell>
    );
  }
}
