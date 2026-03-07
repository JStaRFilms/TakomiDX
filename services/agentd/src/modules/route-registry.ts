import {
  createPreviewRegistrationPayload,
  createPreviewUrl,
  previewRouteRecordSchema,
  type HealthStatus,
  type LocalEdgeProxyState,
  type LocalEdgeProxyStatus,
  type PreviewRegistrationPayload,
  type PreviewRouteRecord,
  type PreviewRouteStatus,
} from "@takomi/contracts";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  TAKOMI_EDGE_PROXY_PING_PATH,
  createLocalEdgeProxy,
  type LocalEdgeProxyRuntime,
} from "./local-edge-proxy";

export interface DeveloperEdgeRuntime {
  name: string;
  ensureStarted(): Promise<LocalEdgeProxyState>;
  upsert(route: PreviewRouteRecord): Promise<PreviewRouteRecord>;
  remove(workspaceId: string): Promise<LocalEdgeProxyState>;
  getState(): LocalEdgeProxyState;
  close?(): Promise<LocalEdgeProxyState>;
}

export interface CreateRouteRegistryOptions {
  routesDir: string;
  edgeHost?: string;
  edgePort?: number;
  edgeAdapter?: DeveloperEdgeRuntime;
  edgeRuntime?: DeveloperEdgeRuntime;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface RegisterPreviewRouteInput {
  workspaceId: string;
  host: string;
  target: string;
  targetPort: number;
  protocol?: "http" | "https";
  healthPath?: string;
  healthStatus?: HealthStatus;
  status?: PreviewRouteStatus;
  lastError?: string | null;
}

export class RouteRegistrationError extends Error {
  constructor(
    message: string,
    public readonly route: PreviewRouteRecord,
    public readonly payload: PreviewRegistrationPayload,
  ) {
    super(message);
    this.name = "RouteRegistrationError";
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function toRouteStatus(
  healthStatus: HealthStatus,
  proxyStatus: LocalEdgeProxyStatus,
): PreviewRouteStatus {
  if (proxyStatus !== "ready") {
    return healthStatus === "failed" ? "failed" : "degraded";
  }

  if (healthStatus === "healthy") {
    return "registered";
  }

  if (healthStatus === "degraded") {
    return "degraded";
  }

  return "failed";
}

function deriveLastError(
  route: PreviewRouteRecord,
  proxyStatus: LocalEdgeProxyStatus,
  proxyError: string | null,
) {
  if (proxyError) {
    return proxyError;
  }

  if (proxyStatus !== "ready") {
    return route.lastError ?? "Takomi local edge is unavailable on this machine.";
  }

  if (route.healthStatus !== "healthy") {
    return route.lastError ?? `Preview upstream is ${route.healthStatus}.`;
  }

  return null;
}

function normalizeProxyState(
  route: PreviewRouteRecord,
  edgeState: LocalEdgeProxyState,
  proxyStatus: LocalEdgeProxyStatus = edgeState.status,
  proxyError: string | null = edgeState.lastError,
) {
  return previewRouteRecordSchema.parse({
    ...route,
    proxyAdapter: edgeState.adapter,
    proxyHost: edgeState.host,
    proxyPort: edgeState.port,
    proxyStatus,
    status: toRouteStatus(route.healthStatus, proxyStatus),
    lastError: deriveLastError(route, proxyStatus, proxyError),
  });
}

async function probeProxyRoute(
  route: PreviewRouteRecord,
  fetchImpl: typeof fetch,
): Promise<{ proxyStatus: LocalEdgeProxyStatus; lastError: string | null }> {
  try {
    const response = await fetchImpl(
      createPreviewUrl(
        route.host,
        route.protocol,
        TAKOMI_EDGE_PROXY_PING_PATH,
        route.proxyPort,
      ),
      {
        method: "GET",
        signal: AbortSignal.timeout(1_000),
      },
    );

    if (
      response.status === 204 &&
      response.headers.get("x-takomi-edge-proxy") === "takomi-local-edge"
    ) {
      return {
        proxyStatus: "ready",
        lastError: null,
      };
    }

    return {
      proxyStatus: "failed",
      lastError: `Takomi local edge returned ${response.status} while probing ${route.host}.`,
    };
  } catch (error) {
    return {
      proxyStatus: "failed",
      lastError:
        error instanceof Error
          ? error.message
          : "Takomi local edge probe failed unexpectedly.",
    };
  }
}

export function createRouteRegistry(options: CreateRouteRegistryOptions) {
  const edgeRuntime =
    options.edgeRuntime ??
    options.edgeAdapter ??
    (createLocalEdgeProxy({
      host: options.edgeHost ?? "127.0.0.1",
      port: options.edgePort ?? 80,
      ...(options.now ? { now: options.now } : {}),
    }) as LocalEdgeProxyRuntime);
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const routes = new Map<string, PreviewRouteRecord>();

  function getRouteStatePath(workspaceId: string) {
    return path.join(options.routesDir, `${workspaceId}.json`);
  }

  function persistRoute(route: PreviewRouteRecord) {
    writeJsonFile(getRouteStatePath(route.workspaceId), route);
    routes.set(route.workspaceId, route);
  }

  function listPersistedRouteIds() {
    mkdirSync(options.routesDir, { recursive: true });

    return readdirSync(options.routesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/, ""));
  }

  function restorePersistedRoutes() {
    for (const workspaceId of listPersistedRouteIds()) {
      const route = previewRouteRecordSchema.parse(
        JSON.parse(readFileSync(getRouteStatePath(workspaceId), "utf8")),
      );
      routes.set(route.workspaceId, route);
    }
  }

  async function applyRoute(
    route: PreviewRouteRecord,
    options: { throwOnFailure?: boolean } = {},
  ) {
    const throwOnFailure = options.throwOnFailure ?? true;
    persistRoute(route);

    const edgeState = await edgeRuntime.ensureStarted();
    let nextRoute = normalizeProxyState(route, edgeState);

    if (edgeState.status !== "ready") {
      persistRoute(nextRoute);

      if (throwOnFailure) {
        throw new RouteRegistrationError(
          `Takomi local edge is unavailable for ${route.workspaceId}.`,
          nextRoute,
          createPreviewRegistrationPayload(nextRoute),
        );
      }

      return nextRoute;
    }

    try {
      nextRoute = await edgeRuntime.upsert(nextRoute);
    } catch (error) {
      nextRoute = normalizeProxyState(
        route,
        edgeState,
        "failed",
        error instanceof Error
          ? error.message
          : "Takomi local edge rejected the preview route.",
      );
      persistRoute(nextRoute);

      if (throwOnFailure) {
        throw new RouteRegistrationError(
          `Failed to apply preview route for ${route.workspaceId}.`,
          nextRoute,
          createPreviewRegistrationPayload(nextRoute),
        );
      }

      return nextRoute;
    }

    const proxyProbe = await probeProxyRoute(nextRoute, fetchImpl);
    nextRoute = normalizeProxyState(
      nextRoute,
      edgeRuntime.getState(),
      proxyProbe.proxyStatus,
      proxyProbe.lastError,
    );
    persistRoute(nextRoute);

    if (proxyProbe.proxyStatus !== "ready" && throwOnFailure) {
      throw new RouteRegistrationError(
        `Takomi local edge could not serve ${route.host}.`,
        nextRoute,
        createPreviewRegistrationPayload(nextRoute),
      );
    }

    return nextRoute;
  }

  restorePersistedRoutes();

  return {
    async initialize() {
      const restoredRoutes = [...routes.values()].sort((left, right) =>
        left.registeredAt.localeCompare(right.registeredAt),
      );
      const payloads: PreviewRegistrationPayload[] = [];

      for (const route of restoredRoutes) {
        const restored = await applyRoute(route, { throwOnFailure: false });
        payloads.push(createPreviewRegistrationPayload(restored));
      }

      return payloads;
    },

    async register(input: RegisterPreviewRouteInput) {
      const route = previewRouteRecordSchema.parse({
        workspaceId: input.workspaceId,
        host: input.host,
        target: input.target,
        targetPort: input.targetPort,
        protocol: input.protocol ?? "http",
        healthPath: input.healthPath ?? "/",
        healthStatus: input.healthStatus ?? "degraded",
        status: input.status ?? "pending",
        proxyAdapter: edgeRuntime.name,
        proxyHost: edgeRuntime.getState().host,
        proxyPort: edgeRuntime.getState().port,
        proxyStatus: edgeRuntime.getState().status,
        registeredAt: now().toISOString(),
        lastError: input.lastError ?? null,
      });

      const syncedRoute = await applyRoute(route);
      return createPreviewRegistrationPayload(syncedRoute);
    },

    async updateHealth(
      workspaceId: string,
      healthStatus: HealthStatus,
      lastError?: string | null,
    ) {
      const current = routes.get(workspaceId);

      if (!current) {
        return null;
      }

      const nextRoute = previewRouteRecordSchema.parse({
        ...current,
        healthStatus,
        lastError: lastError ?? null,
      });

      const syncedRoute = await applyRoute(nextRoute);
      return createPreviewRegistrationPayload(syncedRoute);
    },

    get(workspaceId: string) {
      return routes.get(workspaceId) ?? null;
    },

    list() {
      return Array.from(routes.values());
    },

    getEdgeState() {
      return edgeRuntime.getState();
    },

    edgeAdapterName() {
      return edgeRuntime.name;
    },
  };
}

export type RouteRegistry = ReturnType<typeof createRouteRegistry>;

export function createRouteRegistryBoundary(
  routeCount: number = 0,
  edgeState?: LocalEdgeProxyState,
) {
  return {
    name: "route-registry",
    note: "Registers stable preview hosts and keeps the local edge proxy aligned with route state.",
    status: edgeState?.status ?? "starting",
    activeRoutes: routeCount,
    listener: edgeState
      ? `http://${edgeState.host}:${edgeState.port}`
      : null,
    lastError: edgeState?.lastError ?? null,
  } as const;
}
