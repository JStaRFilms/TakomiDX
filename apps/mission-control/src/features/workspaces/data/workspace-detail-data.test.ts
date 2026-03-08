import type { WorkspaceRuntimeState, WorkspaceSummary } from "@takomi/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentdConnectionError } from "@/lib/agentd-server";
import {
  getWorkspace,
  getWorkspaceDetail,
  getWorkspaceRuntime,
  isWorkspacePreviewLive,
  isWorkspacePreviewUsingFallback,
  loadWorkspaceList,
  resolveWorkspacePreviewUrl,
} from "./workspace-detail-data";

const workspace: WorkspaceSummary = {
  id: "ws_abcd1234",
  slug: "preview-routing",
  repoName: "takomi",
  branch: "agent/preview-routing",
  agentType: "Codex",
  status: "running",
  lastAction: "Runtime active.",
  previewHost: "preview-routing.takomi.localhost",
  tokenCostUsd: 0,
  elapsedMinutes: 2,
  health: "healthy",
  activeRunId: "run_abcd1234",
  pauseReason: null,
  auth: null,
  validation: {
    status: "queued",
    summary: "Validation has not run yet.",
    lastValidatedAt: null,
    bundleId: null,
  },
  mode: "managed",
  ownership: "owned",
  toolFamily: "takomi",
  cwd: "/workspaces/takomi",
  pid: 1234,
};

function createRuntime(
  overrides: Partial<NonNullable<WorkspaceRuntimeState["preview"]>> = {},
): WorkspaceRuntimeState {
  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    repoPath: "C:/repos/takomi",
    runtimeType: "container",
    lifecycle: "running",
    healthStatus: "healthy",
    containerId: "ctr_preview",
    containerName: "takomi-preview",
    processId: null,
    assignedHostPort: 3000,
    preview: {
      workspaceId: workspace.id,
      host: workspace.previewHost,
      url: "http://preview-routing.takomi.localhost/",
      routeStatus: "registered",
      healthStatus: "healthy",
      proxyHost: "127.0.0.1",
      proxyPort: 80,
      proxyStatus: "ready",
      target: "127.0.0.1:3000",
      manualFallbackUrl: "http://127.0.0.1:3000/",
      lastError: null,
      ...overrides,
    },
    startedAt: "2026-03-07T03:08:00.000Z",
    lastError: null,
  };
}

const originalFetch = global.fetch;
const originalAgentdBaseUrl = process.env.NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL;
const originalSampleDataFlag = process.env.TAKOMI_ENABLE_SAMPLE_DATA;

beforeEach(() => {
  process.env.NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL = "http://127.0.0.1:4000";
  delete process.env.TAKOMI_ENABLE_SAMPLE_DATA;
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalAgentdBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL = originalAgentdBaseUrl;
  }

  if (originalSampleDataFlag === undefined) {
    delete process.env.TAKOMI_ENABLE_SAMPLE_DATA;
  } else {
    process.env.TAKOMI_ENABLE_SAMPLE_DATA = originalSampleDataFlag;
  }

  vi.restoreAllMocks();
});

describe("workspace preview routing", () => {
  it("prefers the custom host when the local edge route is live", () => {
    const runtime = createRuntime();

    expect(isWorkspacePreviewLive(runtime)).toBe(true);
    expect(isWorkspacePreviewUsingFallback(runtime)).toBe(false);
    expect(resolveWorkspacePreviewUrl(workspace, runtime)).toBe(
      "http://preview-routing.takomi.localhost/",
    );
  });

  it("falls back to the port URL only when the local edge proxy is unavailable", () => {
    const runtime = createRuntime({
      routeStatus: "degraded",
      proxyStatus: "unavailable",
    });

    expect(isWorkspacePreviewLive(runtime)).toBe(false);
    expect(isWorkspacePreviewUsingFallback(runtime)).toBe(true);
    expect(resolveWorkspacePreviewUrl(workspace, runtime)).toBe(
      "http://127.0.0.1:3000/",
    );
  });
});

describe("workspace data loading", () => {
  it("keeps the workspace list renderable when agentd is unavailable", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    await expect(loadWorkspaceList()).resolves.toMatchObject({
      workspaces: [],
      errorMessage: expect.stringContaining("could not reach the runtime daemon"),
    });
  });

  it("preserves typed connection errors for workspace routes", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    await expect(getWorkspace("ws_abcd1234")).rejects.toBeInstanceOf(AgentdConnectionError);
    await expect(getWorkspaceDetail("ws_abcd1234")).rejects.toBeInstanceOf(AgentdConnectionError);
    await expect(getWorkspaceRuntime("ws_abcd1234")).rejects.toBeInstanceOf(AgentdConnectionError);
  });
});
