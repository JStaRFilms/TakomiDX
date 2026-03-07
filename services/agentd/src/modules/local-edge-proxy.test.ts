import { createServer as createHttpServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalEdgeProxy } from "./local-edge-proxy";
import {
  RouteRegistrationError,
  createRouteRegistry,
} from "./route-registry";

const tempDirs: string[] = [];
const closers: Array<() => Promise<void>> = [];

function createTempDir() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "takomi-local-edge-"));
  tempDirs.push(directory);
  return directory;
}

async function createUpstreamServer(body: string) {
  const server = createHttpServer((request, response) => {
    if (request.url === "/healthz") {
      response.writeHead(200, {
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("ok");
      return;
    }

    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
    });
    response.end(body);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  closers.push(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  );

  return (server.address() as import("node:net").AddressInfo).port;
}

afterEach(async () => {
  for (const close of closers.splice(0).reverse()) {
    await close();
  }

  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("local edge proxy", () => {
  it("serves a registered preview host through the live local edge listener", async () => {
    const root = createTempDir();
    const upstreamPort = await createUpstreamServer("preview host live");
    const routeRegistry = createRouteRegistry({
      routesDir: path.join(root, "routes"),
      edgeRuntime: createLocalEdgeProxy({
        host: "127.0.0.1",
        port: 0,
      }),
    });

    const preview = await routeRegistry.register({
      workspaceId: "ws_proxy001",
      host: "preview-host.takomi.localhost",
      target: `127.0.0.1:${upstreamPort}`,
      targetPort: upstreamPort,
      protocol: "http",
      healthPath: "/healthz",
      healthStatus: "healthy",
    });

    const response = await fetch(preview.url);

    expect(preview.routeStatus).toBe("registered");
    expect(preview.proxyStatus).toBe("ready");
    expect(await response.text()).toBe("preview host live");
  });

  it("rehydrates persisted routes into a fresh local edge listener after restart", async () => {
    const root = createTempDir();
    const upstreamPort = await createUpstreamServer("restored route");
    const firstEdge = createLocalEdgeProxy({
      host: "127.0.0.1",
      port: 0,
    });
    const firstRegistry = createRouteRegistry({
      routesDir: path.join(root, "routes"),
      edgeRuntime: firstEdge,
    });

    const firstPreview = await firstRegistry.register({
      workspaceId: "ws_restore99",
      host: "restore-route.takomi.localhost",
      target: `127.0.0.1:${upstreamPort}`,
      targetPort: upstreamPort,
      protocol: "http",
      healthPath: "/healthz",
      healthStatus: "healthy",
    });

    await firstEdge.close();

    const secondRegistry = createRouteRegistry({
      routesDir: path.join(root, "routes"),
      edgeRuntime: createLocalEdgeProxy({
        host: "127.0.0.1",
        port: 0,
      }),
    });
    const restored = await secondRegistry.initialize();
    const restoredPreview = restored[0]!;
    const response = await fetch(restoredPreview.url);

    expect(restored).toHaveLength(1);
    expect(restoredPreview.host).toBe("restore-route.takomi.localhost");
    expect(restoredPreview.proxyPort).not.toBe(firstPreview.proxyPort);
    expect(await response.text()).toBe("restored route");
  });

  it("surfaces a degraded route when the local edge port is unavailable", async () => {
    const root = createTempDir();
    const upstreamPort = await createUpstreamServer("port occupied");
    const occupiedPortServer = createHttpServer((_, response) => {
      response.writeHead(200);
      response.end("occupied");
    });

    await new Promise<void>((resolve) => {
      occupiedPortServer.listen(0, "127.0.0.1", () => resolve());
    });
    closers.push(
      () =>
        new Promise<void>((resolve, reject) => {
          occupiedPortServer.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        }),
    );

    const occupiedPort = (occupiedPortServer.address() as import("node:net").AddressInfo).port;
    const routeRegistry = createRouteRegistry({
      routesDir: path.join(root, "routes"),
      edgeHost: "127.0.0.1",
      edgePort: occupiedPort,
    });

    await expect(
      routeRegistry.register({
        workspaceId: "ws_proxyfail",
        host: "proxy-fail.takomi.localhost",
        target: `127.0.0.1:${upstreamPort}`,
        targetPort: upstreamPort,
        protocol: "http",
        healthPath: "/healthz",
        healthStatus: "healthy",
      }),
    ).rejects.toBeInstanceOf(RouteRegistrationError);

    const route = routeRegistry.get("ws_proxyfail");
    expect(route).toMatchObject({
      proxyStatus: "unavailable",
      status: "degraded",
    });
    expect(route?.lastError).toContain("already in use");
  });
});
