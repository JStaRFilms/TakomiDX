import {
  createPreviewUrl,
  editorCompanionWorkspaceDetailSchema,
  editorCompanionWorkspaceItemSchema,
  type AgentEvent,
  type AgentRunSummary,
  type AgentTraceSpan,
  type AuthSession,
  type EditorCompanionApprovalState,
  type EditorCompanionWorkspaceDetail,
  type EditorCompanionWorkspaceItem,
  type ReviewBundle,
  type ValidationBundle,
  type WorkspaceMetadata,
  type WorkspaceRuntimeState,
  type WorkspaceValidationSummary,
} from "@takomi/contracts";
import path from "node:path";

export interface BuildEditorCompanionWorkspaceInput {
  workspace: WorkspaceMetadata;
  runtime: WorkspaceRuntimeState | null;
  run: AgentRunSummary | null;
  recentEvents: AgentEvent[];
  recentSpans: AgentTraceSpan[];
  authSessions: AuthSession[];
  validationSummary: WorkspaceValidationSummary;
  validationBundle: ValidationBundle | null;
  reviewBundle: ReviewBundle | null;
}

function deriveWorkspaceStatus(
  workspaceStatus: WorkspaceMetadata["status"],
  runStatus: AgentRunSummary["status"] | null,
  runtimeLifecycle: WorkspaceRuntimeState["lifecycle"] | null,
  validationStatus: WorkspaceValidationSummary["status"] | null,
): WorkspaceMetadata["status"] {
  if (workspaceStatus === "archived") {
    return "archived";
  }

  if (validationStatus === "failed" || validationStatus === "blocked") {
    return "failed";
  }

  if (runStatus === "awaiting_human" || runStatus === "paused") {
    return "awaiting_human";
  }

  if (runStatus === "failed") {
    return "failed";
  }

  if (runStatus === "completed") {
    return validationStatus === "passed" ? "completed" : "validating";
  }

  if (runtimeLifecycle === "booting") {
    return "booting";
  }

  if (runtimeLifecycle === "running") {
    return validationStatus === "passed" ? "completed" : "running";
  }

  if (validationStatus === "running") {
    return "validating";
  }

  if (runStatus === "running") {
    return "running";
  }

  return workspaceStatus;
}

function deriveApprovalState(
  run: AgentRunSummary | null,
  recentEvents: AgentEvent[],
): EditorCompanionApprovalState {
  if (run?.approvalRequired || run?.status === "awaiting_human") {
    const policyEvent = recentEvents.find(
      (event) =>
        event.category === "policy" &&
        (event.outcome === "paused" || event.type === "policy.pause"),
    );

    return {
      status: "pending",
      title: "Approval required",
      detail: run?.pauseReason ?? policyEvent?.detail ?? policyEvent?.summary ?? null,
    };
  }

  return {
    status: "clear",
    title: "No approvals pending",
    detail: null,
  };
}

function resolvePreviewUrl(
  workspace: WorkspaceMetadata,
  runtime: WorkspaceRuntimeState | null,
) {
  if (
    runtime?.preview?.routeStatus === "registered" &&
    runtime.preview.proxyStatus === "ready"
  ) {
    return runtime.preview.url;
  }

  if (
    runtime?.preview?.manualFallbackUrl &&
    (runtime.preview.proxyStatus === "failed" ||
      runtime.preview.proxyStatus === "unavailable")
  ) {
    return runtime.preview.manualFallbackUrl;
  }

  return createPreviewUrl(workspace.previewHost);
}

function buildActions(
  workspace: WorkspaceMetadata,
  previewUrl: string,
) {
  return [
    {
      id: "workspace",
      label: "Open workspace",
      target: "workspace" as const,
      locationType: "mission_control_path" as const,
      location: `/workspaces/${workspace.id}`,
      description: "Open the workspace overview and approval state.",
    },
    {
      id: "preview",
      label: "Open preview",
      target: "preview" as const,
      locationType: "preview_url" as const,
      location: previewUrl,
      description: "Inspect the live preview inside VS Code.",
    },
    {
      id: "logs",
      label: "Open logs",
      target: "logs" as const,
      locationType: "mission_control_path" as const,
      location: `/workspaces/${workspace.id}/logs`,
      description: "Inspect workspace logs and runtime activity.",
    },
    {
      id: "trace",
      label: "Open trace",
      target: "trace" as const,
      locationType: "mission_control_path" as const,
      location: `/workspaces/${workspace.id}/trace`,
      description: "Inspect the latest trace spans for this workspace.",
    },
    {
      id: "validation",
      label: "Open validation",
      target: "validation" as const,
      locationType: "mission_control_path" as const,
      location: `/workspaces/${workspace.id}/validation`,
      description: "Inspect the latest validation and review bundle state.",
    },
    {
      id: "approvals",
      label: "Open approvals",
      target: "approvals" as const,
      locationType: "mission_control_path" as const,
      location: `/workspaces/${workspace.id}`,
      description: "Review pending approvals and operator prompts.",
    },
    {
      id: "worktree",
      label: "Reveal worktree",
      target: "worktree" as const,
      locationType: "filesystem_path" as const,
      location: workspace.worktreePath ?? workspace.repoPath,
      description: "Reveal the workspace worktree on disk.",
    },
    {
      id: "repo",
      label: "Reveal repo",
      target: "repo" as const,
      locationType: "filesystem_path" as const,
      location: workspace.repoPath,
      description: "Reveal the source repository on disk.",
    },
  ];
}

export function buildEditorCompanionWorkspaceItem(
  input: BuildEditorCompanionWorkspaceInput,
): EditorCompanionWorkspaceItem {
  const previewUrl = resolvePreviewUrl(input.workspace, input.runtime);
  const approval = deriveApprovalState(input.run, input.recentEvents);

  return editorCompanionWorkspaceItemSchema.parse({
    id: input.workspace.id,
    slug: input.workspace.slug,
    repoName: path.basename(input.workspace.repoPath),
    branch: input.workspace.branch,
    status: deriveWorkspaceStatus(
      input.workspace.status,
      input.run?.status ?? null,
      input.runtime?.lifecycle ?? null,
      input.validationSummary.status,
    ),
    health: input.runtime?.healthStatus ?? "degraded",
    agentType: input.run?.agentType ?? "Pending agent",
    lastAction:
      input.run?.lastAction ??
      `Workspace ${input.workspace.slug} is ${input.workspace.status}.`,
    previewHost: input.workspace.previewHost,
    previewUrl,
    worktreePath: input.workspace.worktreePath,
    repoPath: input.workspace.repoPath,
    activeRunId: input.run?.id ?? null,
    validation: input.validationSummary,
    approval,
    actions: buildActions(input.workspace, previewUrl),
  });
}

export function buildEditorCompanionWorkspaceDetail(
  input: BuildEditorCompanionWorkspaceInput,
): EditorCompanionWorkspaceDetail {
  return editorCompanionWorkspaceDetailSchema.parse({
    workspace: buildEditorCompanionWorkspaceItem(input),
    metadata: input.workspace,
    runtime: input.runtime,
    run: input.run,
    recentEvents: input.recentEvents,
    recentSpans: input.recentSpans,
    authSessions: input.authSessions,
    validationBundle: input.validationBundle,
    reviewBundle: input.reviewBundle,
  });
}
