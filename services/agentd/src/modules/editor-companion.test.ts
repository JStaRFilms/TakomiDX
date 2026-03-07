import { describe, expect, it } from "vitest";
import {
  type BuildEditorCompanionWorkspaceInput,
  buildEditorCompanionWorkspaceDetail,
  buildEditorCompanionWorkspaceItem,
} from "./editor-companion";

const workspace: BuildEditorCompanionWorkspaceInput["workspace"] = {
  metadataVersion: 1,
  id: "ws_abcd1234",
  slug: "billing-fix",
  repoPath: "C:/repos/takomi",
  worktreePath: "C:/repos/.takomi/worktrees/ws_abcd1234",
  branch: "agent/billing-fix",
  baseBranch: "main",
  branchType: "agent" as const,
  runtimeType: "container" as const,
  previewHost: "billing-fix.takomi.localhost",
  status: "queued" as const,
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
};

const runtime: NonNullable<BuildEditorCompanionWorkspaceInput["runtime"]> = {
  workspaceId: "ws_abcd1234",
  workspaceSlug: "billing-fix",
  repoPath: "C:/repos/takomi",
  runtimeType: "container" as const,
  lifecycle: "running" as const,
  healthStatus: "healthy" as const,
  containerId: "container-123",
  containerName: "takomi-billing-fix",
  processId: null,
  assignedHostPort: 3000,
  preview: {
    workspaceId: "ws_abcd1234",
    host: "billing-fix.takomi.localhost",
    url: "http://billing-fix.takomi.localhost/",
    routeStatus: "registered" as const,
    healthStatus: "healthy" as const,
    proxyHost: "127.0.0.1",
    proxyPort: 80,
    proxyStatus: "ready" as const,
    target: "127.0.0.1:3000",
    manualFallbackUrl: "http://127.0.0.1:3000/",
    lastError: null,
  },
  startedAt: "2026-03-07T03:08:31.000Z",
  lastError: null,
};

const run: NonNullable<BuildEditorCompanionWorkspaceInput["run"]> = {
  id: "run_abcd1234",
  workspaceId: "ws_abcd1234",
  agentType: "Codex",
  status: "awaiting_human" as const,
  traceId: "0123456789abcdef0123456789abcdef",
  rootSpanId: "0123456789abcdef",
  startedAt: "2026-03-07T03:09:31.000Z",
  updatedAt: "2026-03-07T03:17:31.000Z",
  completedAt: null,
  lastAction: "Policy paused the run for filesystem.destructive.",
  lastTool: "rm -rf tmp",
  totalTokens: 1000,
  tokenCostUsd: 0.42,
  stopReason: "approval_required" as const,
  pauseReason: "Approval is required before continuing with filesystem.destructive.",
  approvalRequired: true,
  budget: {
    capUsd: 5,
    warningUsd: 4,
  },
  lastEventId: "evt_002",
  warningCount: 0,
  policyState: null,
};

const validationSummary: BuildEditorCompanionWorkspaceInput["validationSummary"] =
  {
  status: "failed" as const,
  summary: "Validation failed with 1 failed checks, 1 console errors, and 0 network failures.",
  lastValidatedAt: "2026-03-07T03:17:31.000Z",
  bundleId: "bundle_001",
  };

describe("editor companion workspace models", () => {
  it("builds a thin workspace item with actions and approval state", () => {
    const item = buildEditorCompanionWorkspaceItem({
      workspace,
      runtime,
      run,
      recentEvents: [
        {
          id: "evt_002",
          workspaceId: "ws_abcd1234",
          runId: "run_abcd1234",
          category: "policy" as const,
          type: "policy.pause",
          source: "policy-engine",
          timestamp: "2026-03-07T03:17:31.000Z",
          summary: "Policy paused the run for filesystem.destructive.",
          detail: "Approval is required before continuing with filesystem.destructive.",
          outcome: "paused" as const,
          traceId: "0123456789abcdef0123456789abcdef",
          spanId: "0011223344556677",
          parentSpanId: "0123456789abcdef",
          usage: null,
          decision: null,
          attributes: {},
        },
      ],
      recentSpans: [],
      authSessions: [],
      validationSummary,
      validationBundle: null,
      reviewBundle: null,
    });

    expect(item.status).toBe("failed");
    expect(item.approval.status).toBe("pending");
    expect(item.previewUrl).toBe("http://billing-fix.takomi.localhost/");
    expect(item.actions.map((action) => action.id)).toEqual([
      "workspace",
      "preview",
      "logs",
      "trace",
      "validation",
      "approvals",
      "worktree",
      "repo",
    ]);
  });

  it("embeds recent events and spans in the detail model", () => {
    const detail = buildEditorCompanionWorkspaceDetail({
      workspace,
      runtime,
      run: {
        ...run,
        status: "running",
        approvalRequired: false,
        pauseReason: null,
        stopReason: null,
      },
      recentEvents: [],
      recentSpans: [
        {
          traceId: "0123456789abcdef0123456789abcdef",
          spanId: "0011223344556677",
          parentSpanId: "0123456789abcdef",
          runId: "run_abcd1234",
          workspaceId: "ws_abcd1234",
          name: "pnpm test",
          kind: "internal" as const,
          category: "tool" as const,
          source: "codex",
          startedAt: "2026-03-07T03:10:31.000Z",
          endedAt: "2026-03-07T03:11:31.000Z",
          durationMs: 60000,
          statusCode: "ok" as const,
          statusMessage: null,
          outcome: "success" as const,
          attributes: {},
          summary: "Ran pnpm test",
        },
      ],
      authSessions: [],
      validationSummary: {
        ...validationSummary,
        status: "passed",
      },
      validationBundle: null,
      reviewBundle: null,
    });

    expect(detail.workspace.approval.status).toBe("clear");
    expect(detail.recentSpans).toHaveLength(1);
    expect(detail.metadata.worktreePath).toBe(
      "C:/repos/.takomi/worktrees/ws_abcd1234",
    );
  });
});
