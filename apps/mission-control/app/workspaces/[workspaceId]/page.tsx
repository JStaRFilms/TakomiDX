import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderPanel } from "@/components/panels/placeholder-panel";
import { sampleWorkspaces } from "@/features/workspaces/data/sample-workspaces";
import { notFound } from "next/navigation";

interface WorkspaceDetailPageProps {
  params: Promise<{
    workspaceId: string;
  }>;
}

export default async function WorkspaceDetailPage({
  params,
}: WorkspaceDetailPageProps) {
  const { workspaceId } = await params;
  const workspace = sampleWorkspaces.find((item) => item.id === workspaceId);

  if (!workspace) {
    notFound();
  }

  return (
    <AppShell
      eyebrow={workspace.slug}
      title={`${workspace.repoName} / ${workspace.branch}`}
      description="This detail route fixes the stable location for workspace-level controls, traces, logs, and validation."
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PlaceholderPanel
          title="Summary"
          description={`${workspace.slug} is currently ${workspace.status}. Live data will be supplied by agentd once orchestration tasks land.`}
          items={[
            `Preview host: ${workspace.previewHost}`,
            `Last action: ${workspace.lastAction}`,
            `Health state: ${workspace.health}`,
          ]}
        />
        <PlaceholderPanel
          title="Planned tabs"
          description="The route is intentionally shallow. Later tasks can fill these slots without relocating the page."
          items={[
            "Activity",
            "Logs",
            "Trace",
            "Preview",
            "Diff",
            "Validation",
          ]}
        />
      </section>
    </AppShell>
  );
}
