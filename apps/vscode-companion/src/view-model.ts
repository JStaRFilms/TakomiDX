import type {
  EditorCompanionAction,
  EditorCompanionActionTarget,
  EditorCompanionWorkspaceDetail,
  EditorCompanionWorkspaceItem,
} from "@takomi/contracts";

export interface WorkspaceInfoRow {
  id: string;
  label: string;
  value: string;
  detail: string | null;
  tone: "neutral" | "info" | "success" | "warn" | "error";
}

export function humanizeToken(value: string) {
  return value.replace(/_/g, " ");
}

export function describeWorkspace(item: EditorCompanionWorkspaceItem) {
  return `${humanizeToken(item.status)} • ${item.branch}`;
}

export function createWorkspaceTooltip(item: EditorCompanionWorkspaceItem) {
  const lines = [
    `${item.slug}`,
    `Status: ${humanizeToken(item.status)}`,
    `Validation: ${humanizeToken(item.validation.status)}`,
    `Approval: ${item.approval.title}`,
    `Branch: ${item.branch}`,
    `Repo: ${item.repoPath}`,
    `Worktree: ${item.worktreePath ?? "not provisioned"}`,
    `Last action: ${item.lastAction}`,
  ];

  return lines.join("\n");
}

function createAuthInfo(detail: EditorCompanionWorkspaceDetail) {
  const pendingSession = detail.authSessions.find((session) =>
    ["requested", "awaiting_user", "callback_received"].includes(session.status),
  );

  if (!pendingSession) {
    return null;
  }

  return {
    id: "auth",
    label: "Auth",
    value: `${pendingSession.provider} ${humanizeToken(pendingSession.status)}`,
    detail:
      pendingSession.lastError?.message ??
      pendingSession.device?.verificationUriComplete ??
      pendingSession.callbackUrl,
    tone: pendingSession.lastError ? "warn" : "info",
  } satisfies WorkspaceInfoRow;
}

export function buildWorkspaceInfoRows(
  detail: EditorCompanionWorkspaceDetail,
): WorkspaceInfoRow[] {
  const rows: WorkspaceInfoRow[] = [
    {
      id: "status",
      label: "Status",
      value: `${humanizeToken(detail.workspace.status)} (${detail.workspace.health})`,
      detail: detail.workspace.lastAction,
      tone:
        detail.workspace.status === "failed"
          ? "error"
          : detail.workspace.status === "awaiting_human"
            ? "warn"
            : detail.workspace.status === "completed"
              ? "success"
              : "info",
    },
    {
      id: "validation",
      label: "Validation",
      value: humanizeToken(detail.workspace.validation.status),
      detail: detail.workspace.validation.summary,
      tone:
        detail.workspace.validation.status === "failed" ||
        detail.workspace.validation.status === "blocked"
          ? "warn"
          : detail.workspace.validation.status === "passed"
            ? "success"
            : "info",
    },
    {
      id: "approval",
      label: "Approval",
      value: detail.workspace.approval.title,
      detail: detail.workspace.approval.detail,
      tone: detail.workspace.approval.status === "pending" ? "warn" : "neutral",
    },
  ];

  const authRow = createAuthInfo(detail);

  if (authRow) {
    rows.push(authRow);
  }

  if (detail.reviewBundle) {
    rows.push({
      id: "review",
      label: "Review Bundle",
      value: humanizeToken(detail.reviewBundle.validationStatus),
      detail:
        detail.reviewBundle.diagnostics[0] ?? detail.reviewBundle.recommendedAction,
      tone:
        detail.reviewBundle.validationStatus === "passed" ? "success" : "warn",
    });
  }

  return rows;
}

export function resolveActionCommandId(target: EditorCompanionActionTarget) {
  switch (target) {
    case "workspace":
      return "takomi.openWorkspace";
    case "preview":
      return "takomi.openPreview";
    case "logs":
      return "takomi.openLogs";
    case "trace":
      return "takomi.openTrace";
    case "validation":
      return "takomi.openValidation";
    case "approvals":
      return "takomi.openApprovals";
    case "worktree":
      return "takomi.revealWorktree";
    case "repo":
      return "takomi.revealRepo";
  }
}

export function findAction(
  workspace: EditorCompanionWorkspaceItem,
  target: EditorCompanionActionTarget,
): EditorCompanionAction | undefined {
  return workspace.actions.find((action) => action.target === target);
}
