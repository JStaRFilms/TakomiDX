import {
  createPreviewHost,
  createPreviewUrl,
  type WorkspaceMetadata,
  type WorkspaceRuntimeState,
} from "@takomi/contracts";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createValidationBundleManager,
  type BrowserSidecarDriver,
} from "./validation-bundles";

const tempDirs: string[] = [];

function createTempDir() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "takomi-validation-"));
  tempDirs.push(directory);
  return directory;
}

function defineWorkspace(root: string): WorkspaceMetadata {
  const workspaceId = "ws_valid001";

  return {
    metadataVersion: 1,
    id: workspaceId,
    slug: "validation-suite",
    repoPath: path.join(root, "repo"),
    worktreePath: path.join(root, "worktrees", workspaceId),
    branch: "agent/validation-suite",
    baseBranch: "main",
    branchType: "agent",
    runtimeType: "container",
    previewHost: createPreviewHost("validation-suite", "takomi.localhost"),
    status: "running",
    createdAt: "2026-03-07T03:07:31.000Z",
    updatedAt: "2026-03-07T03:07:31.000Z",
    archivedAt: null,
    lastError: null,
    artifacts: {
      root: path.join(root, "workspaces", workspaceId),
      logsDir: path.join(root, "workspaces", workspaceId, "logs"),
      tracesDir: path.join(root, "workspaces", workspaceId, "traces"),
      reviewDir: path.join(root, "workspaces", workspaceId, "review"),
      browserDir: path.join(root, "workspaces", workspaceId, "browser"),
    },
  };
}

function defineRuntime(workspace: WorkspaceMetadata): WorkspaceRuntimeState {
  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    repoPath: workspace.repoPath,
    runtimeType: "container",
    lifecycle: "running",
    healthStatus: "healthy",
    containerId: "ctr_validation",
    containerName: "takomi-validation",
    processId: null,
    assignedHostPort: 3000,
    preview: {
      workspaceId: workspace.id,
      host: workspace.previewHost,
      url: createPreviewUrl(workspace.previewHost),
      routeStatus: "registered",
      healthStatus: "healthy",
      target: "127.0.0.1:3000",
      manualFallbackUrl: "http://127.0.0.1:3000/healthz",
      lastError: null,
    },
    startedAt: "2026-03-07T03:08:00.000Z",
    lastError: null,
  };
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("validation bundle manager", () => {
  it("creates a passed review bundle with browser-backed artifacts", async () => {
    const root = createTempDir();
    const workspace = defineWorkspace(root);
    const runtime = defineRuntime(workspace);
    const driver: BrowserSidecarDriver = {
      async capture(input) {
        mkdirSync(path.dirname(input.screenshotPath), { recursive: true });
        writeFileSync(input.screenshotPath, "png", "utf8");

        return {
          driver: "test-sidecar",
          title: "Validation Suite",
          detail: null,
          console: [],
          network: [],
          selectors: [
            {
              id: "document-shell",
              label: "Document shell renders",
              selector: "body",
              status: "passed",
              detail: "Selector body matched in the live preview.",
              textSnippet: "Workspace detail",
            },
            {
              id: "primary-content",
              label: "Primary content region is present",
              selector: "main",
              status: "passed",
              detail: "Selector main matched in the live preview.",
              textSnippet: "Workspace detail",
            },
          ],
        };
      },
    };
    const manager = createValidationBundleManager({
      workspacesDir: path.join(root, "workspaces"),
      driver,
      fetchImpl: async () =>
        new Response("<html><body><main>ok</main></body></html>", {
          status: 200,
          headers: {
            "content-type": "text/html",
          },
        }),
      now: () => new Date("2026-03-07T03:09:00.000Z"),
      idGenerator: () => "bundle_00000001",
    });

    const result = await manager.runValidation({
      workspace,
      runtime,
      runId: "run_valid001",
    });

    expect(result.bundle.status).toBe("passed");
    expect(result.bundle.previewUrl).toBe("http://127.0.0.1:3000/healthz");
    expect(result.summary.status).toBe("passed");
    expect(result.review.validationStatus).toBe("passed");
    expect(
      result.bundle.artifacts.some((artifact) => artifact.kind === "screenshot"),
    ).toBe(true);
    expect(
      existsSync(path.join(root, "workspaces", workspace.id, "review", "validation-bundle.json")),
    ).toBe(true);
    expect(manager.canComplete(workspace.id).allowed).toBe(true);
  });

  it("blocks validation when the preview is unavailable", async () => {
    const root = createTempDir();
    const workspace = defineWorkspace(root);
    const runtime = defineRuntime(workspace);
    const manager = createValidationBundleManager({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async capture() {
          throw new Error("sidecar should not run when preview preflight fails");
        },
      },
      fetchImpl: async () =>
        new Response("offline", {
          status: 503,
        }),
      now: () => new Date("2026-03-07T03:10:00.000Z"),
      idGenerator: () => "bundle_00000002",
    });

    const result = await manager.runValidation({
      workspace,
      runtime,
      runId: "run_valid001",
    });

    expect(result.bundle.status).toBe("blocked");
    expect(result.bundle.previewUrl).toBe("http://127.0.0.1:3000/healthz");
    expect(result.review.validationStatus).toBe("blocked");
    expect(result.bundle.majorFailures[0]).toContain("Preview responded with 503");
    expect(manager.canComplete(workspace.id)).toMatchObject({
      allowed: false,
    });
  });

  it("fails validation when the sidecar crashes or diagnostics show real browser errors", async () => {
    const root = createTempDir();
    const workspace = defineWorkspace(root);
    const runtime = defineRuntime(workspace);
    let attempt = 0;
    const manager = createValidationBundleManager({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async capture(input) {
          attempt += 1;

          if (attempt === 1) {
            throw new Error("Playwright browser launch failed.");
          }

          mkdirSync(path.dirname(input.screenshotPath), { recursive: true });
          writeFileSync(input.screenshotPath, "png", "utf8");

          return {
            driver: "test-sidecar",
            title: "Validation Suite",
            detail: null,
            console: [
              {
                level: "error",
                text: "ReferenceError: hydrate is not defined",
                location: "http://validation-suite.takomi.localhost/app.js:10",
              },
            ],
            network: [
              {
                url: "http://validation-suite.takomi.localhost/api/data",
                method: "GET",
                status: 500,
                outcome: "failed",
                resourceType: "fetch",
                detail: "HTTP 500",
              },
            ],
            selectors: [
              {
                id: "document-shell",
                label: "Document shell renders",
                selector: "body",
                status: "passed",
                detail: "Selector body matched in the live preview.",
                textSnippet: "Workspace detail",
              },
            ],
          };
        },
      },
      fetchImpl: async () =>
        new Response("<html><body>ok</body></html>", {
          status: 200,
          headers: {
            "content-type": "text/html",
          },
        }),
      now: () => new Date("2026-03-07T03:11:00.000Z"),
      idGenerator: () => `bundle_0000000${attempt + 3}`,
    });

    const sidecarFailure = await manager.runValidation({
      workspace,
      runtime,
      runId: "run_valid001",
    });
    const diagnosticFailure = await manager.runValidation({
      workspace,
      runtime,
      runId: "run_valid001",
    });

    expect(sidecarFailure.bundle.status).toBe("failed");
    expect(sidecarFailure.bundle.previewUrl).toBe("http://127.0.0.1:3000/healthz");
    expect(sidecarFailure.bundle.majorFailures[0]).toContain("Playwright browser launch failed");
    expect(diagnosticFailure.bundle.status).toBe("failed");
    expect(diagnosticFailure.bundle.stats.consoleErrorCount).toBe(1);
    expect(diagnosticFailure.bundle.stats.networkFailureCount).toBe(1);
    expect(
      diagnosticFailure.review.diagnostics.some((item) =>
        item.includes("Console error: ReferenceError"),
      ),
    ).toBe(true);
    expect(manager.getSummary(workspace.id).status).toBe("failed");
  });
});
