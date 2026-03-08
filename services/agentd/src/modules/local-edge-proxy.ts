import {
  localEdgeProxyStateSchema,
  previewRouteRecordSchema,
  type LocalEdgeProxyState,
  type PreviewRouteRecord,
} from "@takomi/contracts";
import { createServer as createHttpServer, request as createHttpRequest } from "node:http";
import { request as createHttpsRequest } from "node:https";
import net, { type AddressInfo, type Socket } from "node:net";

export const TAKOMI_EDGE_PROXY_PING_PATH = "/.takomi/edge/ping";
const EDGE_PROXY_SIGNATURE = "takomi-local-edge";

export interface CreateLocalEdgeProxyOptions {
  host: string;
  port: number;
  now?: () => Date;
}

function writePlainText(
  socket: Socket | null,
  statusCode: number,
  statusText: string,
  message: string,
) {
  if (!socket || socket.destroyed) {
    return;
  }

  socket.end(
    `HTTP/1.1 ${statusCode} ${statusText}\r\n` +
    "Connection: close\r\n" +
    "Content-Type: text/plain; charset=utf-8\r\n" +
    `Content-Length: ${Buffer.byteLength(message, "utf8")}\r\n` +
    `X-Takomi-Edge-Proxy: ${EDGE_PROXY_SIGNATURE}\r\n` +
    "\r\n" +
    message,
  );
}

function writeRouteFailure(
  response: import("node:http").ServerResponse,
  statusCode: number,
  message: string,
) {
  response.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8",
    "x-takomi-edge-proxy": EDGE_PROXY_SIGNATURE,
  });
  response.end(message);
}

function normalizeHost(hostHeader: string | undefined) {
  if (!hostHeader) {
    return null;
  }

  return hostHeader.replace(/:\d+$/, "").trim().toLowerCase() || null;
}

function splitTarget(target: string) {
  const separatorIndex = target.lastIndexOf(":");

  if (separatorIndex === -1) {
    throw new Error(`Invalid route target "${target}".`);
  }

  return {
    host: target.slice(0, separatorIndex),
    port: Number(target.slice(separatorIndex + 1)),
  };
}

function isHealthyRoute(route: PreviewRouteRecord) {
  return route.healthStatus === "healthy" && route.status === "registered";
}

export function createLocalEdgeProxy(options: CreateLocalEdgeProxyOptions) {
  const now = options.now ?? (() => new Date());
  const routesByWorkspace = new Map<string, PreviewRouteRecord>();
  const routesByHost = new Map<string, PreviewRouteRecord>();
  let server: import("node:http").Server | null = null;
  let startPromise: Promise<LocalEdgeProxyState> | null = null;
  let state = localEdgeProxyStateSchema.parse({
    adapter: EDGE_PROXY_SIGNATURE,
    host: options.host,
    port: options.port > 0 ? options.port : 1,
    status: "starting",
    activeRoutes: 0,
    startedAt: null,
    lastError: null,
  });

  function snapshotState(overrides: Partial<LocalEdgeProxyState> = {}) {
    state = localEdgeProxyStateSchema.parse({
      ...state,
      activeRoutes: routesByWorkspace.size,
      ...overrides,
    });

    return state;
  }

  function proxyHttpRequest(
    route: PreviewRouteRecord,
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse,
  ) {
    const upstream = splitTarget(route.target);
    const requestImpl =
      route.protocol === "https" ? createHttpsRequest : createHttpRequest;
    const upstreamRequest = requestImpl(
      {
        hostname: upstream.host,
        port: upstream.port,
        method: request.method,
        path: request.url,
        headers: {
          ...request.headers,
          "x-forwarded-host": request.headers.host ?? route.host,
          "x-forwarded-proto": route.protocol,
        },
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );

    upstreamRequest.once("error", (error) => {
      writeRouteFailure(
        response,
        502,
        `TakomiDX local edge could not reach ${route.target}: ${error.message}`,
      );
    });

    request.pipe(upstreamRequest);
  }

  function proxyUpgrade(
    route: PreviewRouteRecord,
    request: import("node:http").IncomingMessage,
    socket: Socket,
    head: Buffer,
  ) {
    const upstream = splitTarget(route.target);
    const upstreamSocket = net.connect(upstream.port, upstream.host, () => {
      let handshake = `${request.method ?? "GET"} ${request.url ?? "/"} HTTP/${request.httpVersion}\r\n`;

      for (let index = 0; index < request.rawHeaders.length; index += 2) {
        const key = request.rawHeaders[index];
        const value = request.rawHeaders[index + 1];

        if (key && value) {
          handshake += `${key}: ${value}\r\n`;
        }
      }

      handshake += `x-forwarded-host: ${request.headers.host ?? route.host}\r\n`;
      handshake += `x-forwarded-proto: ${route.protocol}\r\n\r\n`;

      upstreamSocket.write(handshake);

      if (head.length > 0) {
        upstreamSocket.write(head);
      }

      socket.pipe(upstreamSocket).pipe(socket);
    });

    upstreamSocket.once("error", (error) => {
      writePlainText(
        socket,
        502,
        "Bad Gateway",
        `TakomiDX local edge could not upgrade ${route.target}: ${error.message}`,
      );
    });
  }

  function handleRequest(
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse,
  ) {
    const host = normalizeHost(request.headers.host);
    const route = host ? routesByHost.get(host) ?? null : null;

    if (!route) {
      writeRouteFailure(response, 404, "No TakomiDX preview route is registered for this host.");
      return;
    }

    if ((request.url ?? "/") === TAKOMI_EDGE_PROXY_PING_PATH) {
      response.writeHead(204, {
        "x-takomi-edge-proxy": EDGE_PROXY_SIGNATURE,
      });
      response.end();
      return;
    }

    if (!isHealthyRoute(route)) {
      writeRouteFailure(
        response,
        route.healthStatus === "failed" ? 503 : 502,
        route.lastError ??
        `Preview route ${route.host} is ${route.healthStatus} and not proxying browser traffic yet.`,
      );
      return;
    }

    proxyHttpRequest(route, request, response);
  }

  function handleUpgrade(
    request: import("node:http").IncomingMessage,
    socket: Socket,
    head: Buffer,
  ) {
    const host = normalizeHost(request.headers.host);
    const route = host ? routesByHost.get(host) ?? null : null;

    if (!route) {
      writePlainText(socket, 404, "Not Found", "No TakomiDX preview route is registered for this host.");
      return;
    }

    if (!isHealthyRoute(route)) {
      writePlainText(
        socket,
        route.healthStatus === "failed" ? 503 : 502,
        "Bad Gateway",
        route.lastError ??
        `Preview route ${route.host} is ${route.healthStatus} and not proxying upgrade traffic yet.`,
      );
      return;
    }

    proxyUpgrade(route, request, socket, head);
  }

  async function ensureStarted() {
    if (server && state.status === "ready") {
      return state;
    }

    if (startPromise) {
      return startPromise;
    }

    snapshotState({
      status: "starting",
      lastError: null,
    });

    startPromise = new Promise<LocalEdgeProxyState>((resolve) => {
      const nextServer = createHttpServer(handleRequest);
      nextServer.on("upgrade", handleUpgrade);
      nextServer.once("error", (error: NodeJS.ErrnoException) => {
        server = null;
        startPromise = null;
        resolve(
          snapshotState({
            status: error.code === "EADDRINUSE" ? "unavailable" : "failed",
            lastError:
              error.code === "EADDRINUSE"
                ? `TakomiDX local edge could not bind ${options.host}:${options.port} because the port is already in use.`
                : error.message,
          }),
        );
      });
      nextServer.listen(options.port, options.host, () => {
        const address = nextServer.address() as AddressInfo | null;
        server = nextServer;
        startPromise = null;
        resolve(
          snapshotState({
            host: address?.address ?? options.host,
            port: address?.port ?? options.port,
            status: "ready",
            startedAt: state.startedAt ?? now().toISOString(),
            lastError: null,
          }),
        );
      });
    });

    return startPromise;
  }

  return {
    name: EDGE_PROXY_SIGNATURE,

    async ensureStarted() {
      return ensureStarted();
    },

    async upsert(route: PreviewRouteRecord) {
      const nextRoute = previewRouteRecordSchema.parse({
        ...route,
        proxyAdapter: EDGE_PROXY_SIGNATURE,
        proxyHost: state.host,
        proxyPort: state.port,
        proxyStatus: state.status,
      });

      const previous = routesByWorkspace.get(nextRoute.workspaceId);

      if (previous && previous.host !== nextRoute.host) {
        routesByHost.delete(previous.host);
      }

      routesByWorkspace.set(nextRoute.workspaceId, nextRoute);
      routesByHost.set(nextRoute.host, nextRoute);
      snapshotState();

      return nextRoute;
    },

    async remove(workspaceId: string) {
      const current = routesByWorkspace.get(workspaceId);

      if (current) {
        routesByWorkspace.delete(workspaceId);
        routesByHost.delete(current.host);
        snapshotState();
      }

      return state;
    },

    getState() {
      return state;
    },

    async close() {
      if (!server) {
        return snapshotState({
          status: "unavailable",
        });
      }

      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      server = null;

      return snapshotState({
        status: "unavailable",
      });
    },
  };
}

export type LocalEdgeProxyRuntime = ReturnType<typeof createLocalEdgeProxy>;
