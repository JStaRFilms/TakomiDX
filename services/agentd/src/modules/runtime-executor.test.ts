import {
  createPreviewHost,
  createRuntimeTarget,
  type WorkspaceRuntimeConfig,
} from "@takomi/contracts";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  RouteRegistrationError,
  createRouteRegistry,
} from "./route-registry";
import { createLocalEdgeProxy } from "./local-edge-proxy";
import {
  RuntimeBootError,
  createRuntimeExecutor,
  type ContainerRuntimeDriver,
} from "./runtime-executor";

const tempDirs: string[] = [];

function createTempDir() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "takomi-agentd-"));
  tempDirs.push(directory);
  return directory;
}

function defineRuntimeConfig(
  overrides: Partial<WorkspaceRuntimeConfig> = {},
): WorkspaceRuntimeConfig {
  const workspaceSlug = overrides.workspaceSlug ?? "runtime-routing";
  const previewDomain = "takomi.localhost";

  return {
    workspaceId: overrides.workspaceId ?? "ws_abcd1234",
    workspaceSlug,
    repoPath: overrides.repoPath ?? "C:/repos/takomi/runtime-routing",
    previewHost:
      overrides.previewHost ?? createPreviewHost(workspaceSlug, previewDomain),
    runtimeType: "container",
    container: {
      image: "node:22-alpine",
      command: ["pnpm", "dev", "--hostname", "0.0.0.0"],
      workdir: "/workspace",
    },
    env: overrides.env ?? {
      NEXT_PUBLIC_TAKOMI_PREVIEW_DOMAIN: previewDomain,
    },
    port: overrides.port ?? {
      containerPort: 3000,
      protocol: "http",
    },
    healthCheckPath: overrides.healthCheckPath ?? "/healthz",
  };
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("runtime executor and route registry", () => {
  it("boots multiple workspaces in parallel and assigns stable preview hosts", async () => {
    const root = createTempDir();
    let nextPort = 45231;

    const driver: ContainerRuntimeDriver = {
      async start({ config }) {
        const hostPort = nextPort++;

        return {
          containerId: `ctr-${config.workspaceId}`,
          hostPort,
        };
      },
    };

    const runtimeExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver,
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });
    const routeRegistry = createRouteRegistry({
      routesDir: path.join(root, "routes"),
      edgeRuntime: createLocalEdgeProxy({
        host: "127.0.0.1",
        port: 0,
      }),
    });
    const configs = [
      defineRuntimeConfig({
        workspaceId: "ws_runtimea1",
        workspaceSlug: "runtime-a",
      }),
      defineRuntimeConfig({
        workspaceId: "ws_runtimeb2",
        workspaceSlug: "runtime-b",
      }),
    ];

    const runtimes = await Promise.all(
      configs.map(async (config) => {
        const runtime = await runtimeExecutor.boot(config);
        const preview = await routeRegistry.register({
          workspaceId: runtime.workspaceId,
          host: config.previewHost,
          target: createRuntimeTarget(runtime.assignedHostPort!),
          targetPort: runtime.assignedHostPort!,
          protocol: config.port.protocol,
          healthPath: config.healthCheckPath,
          healthStatus: runtime.healthStatus,
          lastError: runtime.lastError,
        });

        return runtimeExecutor.attachPreview(runtime.workspaceId, preview);
      }),
    );

    expect(
      new Set(runtimes.map((runtime) => runtime?.assignedHostPort)).size,
    ).toBe(2);
    expect(runtimes.every((runtime) => runtime?.lifecycle === "running")).toBe(true);
    expect(runtimes.map((runtime) => runtime?.preview?.host)).toEqual([
      "runtime-a.takomi.localhost",
      "runtime-b.takomi.localhost",
    ]);
    expect(runtimes.every((runtime) => runtime?.preview?.routeStatus === "registered")).toBe(
      true,
    );

    const routeRecord = JSON.parse(
      readFileSync(path.join(root, "routes", "ws_runtimea1.json"), "utf8"),
    );
    expect(routeRecord.host).toBe("runtime-a.takomi.localhost");
  });

  it("surfaces runtime boot failures as structured state", async () => {
    const root = createTempDir();
    const runtimeExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          throw new Error("Docker daemon is not reachable.");
        },
      },
      fetchImpl: fetch,
    });

    await expect(runtimeExecutor.boot(defineRuntimeConfig())).rejects.toMatchObject({
      name: "RuntimeBootError",
    });

    try {
      await runtimeExecutor.boot(defineRuntimeConfig());
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeBootError);
      if (error instanceof RuntimeBootError) {
        expect(error.state.lifecycle).toBe("failed");
        expect(error.state.healthStatus).toBe("failed");
        expect(error.state.lastError).toContain("Docker daemon");
      }
    }
  });

  it("persists route registration failures with fallback diagnostics", async () => {
    const root = createTempDir();
    const routeRegistry = createRouteRegistry({
      routesDir: path.join(root, "routes"),
      edgeAdapter: {
        name: "caddy",
        async ensureStarted() {
          return {
            adapter: "caddy",
            host: "127.0.0.1",
            port: 80,
            status: "ready",
            activeRoutes: 0,
            startedAt: "2026-03-07T03:07:31.000Z",
            lastError: null,
          };
        },
        async upsert() {
          throw new Error("Caddy admin API refused the route.");
        },
        async remove() {
          return {
            adapter: "caddy",
            host: "127.0.0.1",
            port: 80,
            status: "ready",
            activeRoutes: 0,
            startedAt: "2026-03-07T03:07:31.000Z",
            lastError: null,
          };
        },
        getState() {
          return {
            adapter: "caddy",
            host: "127.0.0.1",
            port: 80,
            status: "ready",
            activeRoutes: 0,
            startedAt: "2026-03-07T03:07:31.000Z",
            lastError: null,
          };
        },
      },
    });

    await expect(
      routeRegistry.register({
        workspaceId: "ws_routefail1",
        host: "route-fail.takomi.localhost",
        target: "127.0.0.1:45231",
        targetPort: 45231,
        protocol: "http",
        healthPath: "/healthz",
        healthStatus: "degraded",
      }),
    ).rejects.toBeInstanceOf(RouteRegistrationError);

    const routeRecord = JSON.parse(
      readFileSync(path.join(root, "routes", "ws_routefail1.json"), "utf8"),
    );
    expect(routeRecord.status).toBe("degraded");
    expect(routeRecord.lastError).toContain("Caddy admin API");
  });

  it("restores persisted route records after registry restart", async () => {
    const root = createTempDir();
    const firstRegistry = createRouteRegistry({
      routesDir: path.join(root, "routes"),
      edgeRuntime: createLocalEdgeProxy({
        host: "127.0.0.1",
        port: 0,
      }),
    });

    await firstRegistry.register({
      workspaceId: "ws_restore01",
      host: "restore-route.takomi.localhost",
      target: "127.0.0.1:45231",
      targetPort: 45231,
      protocol: "http",
      healthPath: "/healthz",
      healthStatus: "healthy",
    });

    const secondRegistry = createRouteRegistry({
      routesDir: path.join(root, "routes"),
      edgeRuntime: createLocalEdgeProxy({
        host: "127.0.0.1",
        port: 0,
      }),
    });

    await secondRegistry.initialize();

    expect(secondRegistry.get("ws_restore01")).toMatchObject({
      host: "restore-route.takomi.localhost",
      status: "registered",
    });
    expect(secondRegistry.list()).toHaveLength(1);
  });

  it("restores persisted runtime state and config after executor restart", async () => {
    const root = createTempDir();
    const firstExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          return {
            containerId: "ctr-ws_restore02",
            hostPort: 45231,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    const booted = await firstExecutor.boot(
      defineRuntimeConfig({
        workspaceId: "ws_restore02",
        workspaceSlug: "restore-runtime",
      }),
    );

    expect(booted.lifecycle).toBe("running");

    const secondExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          throw new Error("start should not be called");
        },
        async inspect() {
          return {
            containerId: "ctr-ws_restore02",
            hostPort: 45231,
            isRunning: true,
            processId: 1234,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    expect(secondExecutor.get("ws_restore02")).toMatchObject({
      workspaceId: "ws_restore02",
      assignedHostPort: 45231,
      lifecycle: "running",
    });

    const refreshed = await secondExecutor.refreshHealth("ws_restore02");
    expect(refreshed).not.toBeNull();
    expect(refreshed?.healthStatus).toBe("healthy");
  });

  it("marks a persisted runtime as stopped when Docker is unavailable during refresh", async () => {
    const root = createTempDir();
    const firstExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          return {
            containerId: "ctr-ws_docker01",
            hostPort: 45231,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    await firstExecutor.boot(
      defineRuntimeConfig({
        workspaceId: "ws_docker01",
        workspaceSlug: "docker-unavailable",
      }),
    );

    const secondExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          throw new Error("start should not be called");
        },
        async inspect() {
          throw new Error("Cannot connect to the Docker daemon at unix:///var/run/docker.sock");
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    const refreshed = await secondExecutor.refreshHealth("ws_docker01");
    expect(refreshed).toMatchObject({
      lifecycle: "stopped",
      healthStatus: "degraded",
      assignedHostPort: 45231,
    });
    expect(refreshed?.lastError).toContain("Docker is unavailable");
  });

  it("reconciles restored runtimes during executor startup recovery", async () => {
    const root = createTempDir();
    const firstExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          return {
            containerId: "ctr-ws_reconcile",
            hostPort: 45231,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    await firstExecutor.boot(
      defineRuntimeConfig({
        workspaceId: "ws_reconcile",
        workspaceSlug: "reconcile-runtime",
      }),
    );

    const secondExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          throw new Error("start should not be called");
        },
        async inspect() {
          return {
            containerId: "ctr-ws_reconcile",
            hostPort: 45231,
            isRunning: false,
            processId: null,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    expect(secondExecutor.get("ws_reconcile")).toMatchObject({
      lifecycle: "running",
      assignedHostPort: 45231,
    });

    await secondExecutor.reconcileAll();

    expect(secondExecutor.get("ws_reconcile")).toMatchObject({
      lifecycle: "stopped",
      healthStatus: "degraded",
      assignedHostPort: 45231,
    });
  });

  it("keeps runtime booting while preview health is still unavailable", async () => {
    const root = createTempDir();
    const runtimeExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          return {
            containerId: "ctr-ws_booting01",
            hostPort: 45231,
          };
        },
      },
      fetchImpl: async () => {
        throw new Error("fetch failed");
      },
    });

    const runtime = await runtimeExecutor.boot(
      defineRuntimeConfig({
        workspaceId: "ws_booting01",
        workspaceSlug: "booting-runtime",
      }),
    );

    expect(runtime.lifecycle).toBe("booting");
    expect(runtime.healthStatus).toBe("degraded");
    expect(runtime.lastError).toContain("fetch failed");
  });

  it("writes shared corepack and pnpm cache settings into the runtime env file", async () => {
    const root = createTempDir();
    let capturedEnvFilePath = "";

    const runtimeExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start({ envFilePath }) {
          capturedEnvFilePath = envFilePath;
          return {
            containerId: "ctr-ws_cache01",
            hostPort: 45231,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    await runtimeExecutor.boot(
      defineRuntimeConfig({
        workspaceId: "ws_cache0a1",
        workspaceSlug: "cache-runtime",
      }),
    );

    const envFile = readFileSync(capturedEnvFilePath, "utf8");
    expect(envFile).toContain("COREPACK_HOME=/var/cache/takomi/corepack");
    expect(envFile).toContain("PNPM_STORE_DIR=/var/cache/takomi/pnpm/store");
    expect(envFile).toContain("npm_config_store_dir=/var/cache/takomi/pnpm/store");
    expect(envFile).toContain("pnpm_config_store_dir=/var/cache/takomi/pnpm/store");
  });

  it("marks a persisted runtime as stopped when its container is no longer running", async () => {
    const root = createTempDir();
    const firstExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          return {
            containerId: "ctr-ws_stopped1",
            hostPort: 45231,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    await firstExecutor.boot(
      defineRuntimeConfig({
        workspaceId: "ws_stopped1",
        workspaceSlug: "stopped-runtime",
      }),
    );

    const secondExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          throw new Error("start should not be called");
        },
        async inspect() {
          return {
            containerId: "ctr-ws_stopped1",
            hostPort: 45231,
            isRunning: false,
            processId: null,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    const refreshed = await secondExecutor.refreshHealth("ws_stopped1");
    expect(refreshed).toMatchObject({
      lifecycle: "stopped",
      healthStatus: "degraded",
      assignedHostPort: 45231,
    });
    expect(refreshed?.lastError).toContain("stopped");
  });

  it("restarts an existing stopped container instead of creating a new one", async () => {
    const root = createTempDir();
    const initialExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          return {
            containerId: "ctr-ws_resume01",
            hostPort: 45231,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    const config = defineRuntimeConfig({
      workspaceId: "ws_resume01",
      workspaceSlug: "resume-runtime",
    });
    await initialExecutor.boot(config);

    let startCalls = 0;
    let restartCalls = 0;
    let isRunning = false;
    const resumedExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: {
        async start() {
          startCalls += 1;
          return {
            containerId: "ctr-new",
            hostPort: 49999,
          };
        },
        async inspect() {
          return {
            containerId: "ctr-ws_resume01",
            hostPort: 45231,
            isRunning,
            processId: isRunning ? 1234 : null,
          };
        },
        async startExisting() {
          restartCalls += 1;
          isRunning = true;
          return {
            containerId: "ctr-ws_resume01",
            hostPort: 45231,
            processId: 1234,
          };
        },
      },
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
    });

    const resumed = await resumedExecutor.boot(config);
    expect(startCalls).toBe(0);
    expect(restartCalls).toBe(1);
    expect(resumed).toMatchObject({
      containerId: "ctr-ws_resume01",
      assignedHostPort: 45231,
      lifecycle: "running",
    });
  });
});
