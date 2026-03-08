import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgentdServer } from "./server";

describe("Attached Workspace Lifecycle", () => {
  let dataDir: string;
  let server: ReturnType<typeof createAgentdServer>;
  let port: number;
  let previewPort: number;
  let previewServer: Server;
  let workspaceId: string;

  beforeAll(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), "agentd-test-"));
    port = 30000 + Math.floor(Math.random() * 10000);
    previewPort = port + 2;

    previewServer = createServer((request, response) => {
      if (request.url === "/healthz" || request.url === "/") {
        response.writeHead(200, {
          "content-type": "text/plain; charset=utf-8",
        });
        response.end("ok");
        return;
      }

      response.writeHead(404);
      response.end("not found");
    });

    await new Promise<void>((resolve) => {
      previewServer.listen(previewPort, "127.0.0.1", () => resolve());
    });

    server = createAgentdServer({
      appName: "TakomiDX Test",
      authBrokerHost: "auth.takomi.localhost",
      dataDir,
      edgeHost: "127.0.0.1",
      edgePort: port + 1,
      editorTarget: "vscode",
      host: "127.0.0.1",
      port,
      previewDomain: "takomi.localhost",
      routesDir: path.join(dataDir, "routes"),
      runsDir: path.join(dataDir, "runs"),
      runtimeBackend: "container",
      stateDbPath: path.join(dataDir, "state", "agentd.db"),
      stateDir: path.join(dataDir, "state"),
      worktreeRootDir: path.join(dataDir, "worktrees"),
      workspacesDir: path.join(dataDir, "workspaces"),
    });

    await server.initialize();

    await new Promise<void>((resolve) => {
      server.server.listen(port, "127.0.0.1", () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.server.close(() => resolve());
    });

    await new Promise<void>((resolve) => {
      previewServer.close(() => resolve());
    });

    rmSync(dataDir, { recursive: true, force: true });
  });

  it("registers an attached workspace without creating a managed git worktree", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/workspaces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repoUrl: "https://github.com/takomi/hybrid-test.git",
        repoPath: "/mock/local/path",
        mode: "attached",
        slug: "hybrid-test-slug",
      }),
    });

    expect(response.status).toBe(201);
    const workspace = (await response.json()) as {
      id: string;
      mode: string;
      repoPath: string;
    };
    expect(workspace.id).toBeDefined();
    expect(workspace.mode).toBe("attached");
    expect(workspace.repoPath).toBe("/mock/local/path");

    workspaceId = workspace.id;
  });

  it("registers an external preview for the attached workspace", async () => {
    expect(workspaceId).toBeDefined();

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/workspaces/${workspaceId}/preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetPort: previewPort,
          protocol: "http",
          healthPath: "/healthz",
        }),
      },
    );

    expect(response.status).toBe(201);
    const preview = (await response.json()) as {
      target: string;
      routeStatus: string;
      healthStatus: string;
      manualFallbackUrl: string;
    };
    expect(preview.target).toBe(`127.0.0.1:${previewPort}`);
    expect(preview.routeStatus).toBe("registered");
    expect(preview.healthStatus).toBe("healthy");
    expect(preview.manualFallbackUrl).toBe(`http://127.0.0.1:${previewPort}/`);
  });

  it("reports preview health appropriately in mission control read model", async () => {
    const runResponse = await fetch(
      `http://127.0.0.1:${port}/api/v1/observability/runs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          agentType: "Codex",
          ownership: "external",
          toolFamily: "codex",
          cwd: "/mock/local/path",
          pid: 8421,
        }),
      },
    );
    expect(runResponse.status).toBe(201);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/mission-control/workspaces/${workspaceId}`,
    );
    expect(response.status).toBe(200);

    const detail = (await response.json()) as {
      workspace: {
        id: string;
        health: string;
        mode: string;
        ownership: string | null;
        toolFamily: string | null;
        cwd: string | null;
        pid: number | null;
      };
    };
    expect(detail.workspace.id).toBe(workspaceId);
    expect(detail.workspace.health).toBe("healthy");
    expect(detail.workspace.mode).toBe("attached");
    expect(detail.workspace.ownership).toBe("external");
    expect(detail.workspace.toolFamily).toBe("codex");
    expect(detail.workspace.cwd).toBe("/mock/local/path");
    expect(detail.workspace.pid).toBe(8421);
  });
});
