import { describe, expect, it } from "vitest";
import {
  buildWorkspaceInfoRows,
  createWorkspaceTooltip,
  describeWorkspace,
  resolveActionCommandId,
} from "./view-model";

const workspace = {
  id: "ws_abcd1234",
  slug: "billing-fix",
  repoName: "takomi",
  branch: "agent/billing-fix",
  status: "awaiting_human" as const,
  health: "healthy" as const,
  agentType: "Codex",
  lastAction: "Policy paused the run for filesystem.destructive.",
  previewHost: "billing-fix.takomi.localhost",
  previewUrl: "http://billing-fix.takomi.localhost/",
  worktreePath: "C:/repos/.takomi/worktrees/ws_abcd1234",
  repoPath: "C:/repos/takomi",
  activeRunId: "run_abcd1234",
  validation: {
    status: "failed" as const,
    summary: "Validation failed with 1 failed check.",
    lastValidatedAt: "2026-03-07T03:17:31.000Z",
    bundleId: "bundle_001",
  },
  approval: {
    status: "pending" as const,
    title: "Approval required",
    detail: "Filesystem destructive command needs a human decision.",
  },
  actions: [],
};

describe("editor view model helpers", () => {
  it("formats workspace descriptions and tooltips with mission control terminology", () => {
    expect(describeWorkspace(workspace)).toBe("awaiting human • agent/billing-fix");
    expect(createWorkspaceTooltip(workspace)).toContain("Validation: failed");
    expect(createWorkspaceTooltip(workspace)).toContain("Approval: Approval required");
  });

  it("builds info rows for validation, approval, auth, and review state", () => {
    const rows = buildWorkspaceInfoRows({
      workspace,
      metadata: {
        metadataVersion: 1,
        id: "ws_abcd1234",
        slug: "billing-fix",
        repoPath: "C:/repos/takomi",
        worktreePath: "C:/repos/.takomi/worktrees/ws_abcd1234",
        branch: "agent/billing-fix",
        baseBranch: "main",
        branchType: "agent",
        runtimeType: "container",
        previewHost: "billing-fix.takomi.localhost",
        status: "awaiting_human",
        createdAt: "2026-03-07T03:07:31.000Z",
        updatedAt: "2026-03-07T03:17:31.000Z",
        archivedAt: null,
        lastError: null,
        artifacts: {
          root: "C:/repos/.takomi/workspaces/ws_abcd1234",
          logsDir: "C:/repos/.takomi/workspaces/ws_abcd1234/logs",
          tracesDir: "C:/repos/.takomi/workspaces/ws_abcd1234/traces",
          reviewDir: "C:/repos/.takomi/workspaces/ws_abcd1234/review",
          browserDir: "C:/repos/.takomi/workspaces/ws_abcd1234/browser",
        },
      },
      runtime: null,
      run: null,
      recentEvents: [],
      recentSpans: [],
      authSessions: [
        {
          id: "auth_abcd1234",
          workspaceId: "ws_abcd1234",
          provider: "github",
          flow: "browser_callback",
          status: "awaiting_user",
          stateNonce: "1234567890123456",
          callbackUrl: "http://auth.takomi.localhost/callback/github/ws_abcd1234",
          previewUrl: "http://billing-fix.takomi.localhost/",
          forwardPath: "/.takomi/auth/callback",
          requestedAt: "2026-03-07T03:07:31.000Z",
          updatedAt: "2026-03-07T03:08:31.000Z",
          expiresAt: "2026-03-07T03:12:31.000Z",
          completedAt: null,
          lastError: null,
          callback: null,
          device: null,
          forwardUrl: null,
        },
      ],
      validationBundle: null,
      reviewBundle: {
        bundleVersion: 1,
        validationBundleId: "bundle_001",
        workspaceId: "ws_abcd1234",
        workspaceSlug: "billing-fix",
        runId: "run_abcd1234",
        previewUrl: "http://billing-fix.takomi.localhost/",
        validationStatus: "failed",
        generatedAt: "2026-03-07T03:17:31.000Z",
        testSummary: "Validation failed with 1 failed check.",
        diagnostics: [
          "Console error: auth is not defined",
        ],
        artifactLinks: [],
        recommendedAction: "Inspect the diagnostics and retry validation.",
      },
    });

    expect(rows.map((row) => row.id)).toEqual([
      "status",
      "validation",
      "approval",
      "auth",
      "review",
    ]);
  });

  it("maps action targets to concrete VS Code commands", () => {
    expect(resolveActionCommandId("preview")).toBe("takomi.openPreview");
    expect(resolveActionCommandId("trace")).toBe("takomi.openTrace");
    expect(resolveActionCommandId("repo")).toBe("takomi.revealRepo");
  });
});
