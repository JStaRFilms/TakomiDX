import {
  createPreviewRegistrationPayload,
  previewRouteRecordSchema,
  type HealthStatus,
  type PreviewRegistrationPayload,
  type PreviewRouteRecord,
  type PreviewRouteStatus,
} from "@takomi/contracts";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface DeveloperEdgeAdapter {
  name: string;
  upsert(route: PreviewRouteRecord): Promise<string | null>;
}

export interface CreateRouteRegistryOptions {
  routesDir: string;
  edgeAdapter?: DeveloperEdgeAdapter;
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

function toRouteStatus(healthStatus: HealthStatus): PreviewRouteStatus {
  if (healthStatus === "healthy") {
    return "registered";
  }

  if (healthStatus === "degraded") {
    return "degraded";
  }

  return "failed";
}

function createCaddyRouteDocument(route: PreviewRouteRecord) {
  return {
    "@id": route.workspaceId,
    match: [
      {
        host: [route.host],
      },
    ],
    handle: [
      {
        handler: "reverse_proxy",
        health_uri: route.healthPath,
        upstreams: [
          {
            dial: route.target,
          },
        ],
      },
    ],
    terminal: true,
  };
}

export function createCaddyEdgeAdapter(routesDir: string): DeveloperEdgeAdapter {
  return {
    name: "caddy",
    async upsert(route) {
      const filePath = path.join(routesDir, "caddy", `${route.workspaceId}.json`);
      writeJsonFile(filePath, createCaddyRouteDocument(route));
      return filePath;
    },
  };
}

export function createRouteRegistry(options: CreateRouteRegistryOptions) {
  const edgeAdapter =
    options.edgeAdapter ?? createCaddyEdgeAdapter(options.routesDir);
  const now = options.now ?? (() => new Date());
  const routes = new Map<string, PreviewRouteRecord>();

  function getRouteStatePath(workspaceId: string) {
    return path.join(options.routesDir, `${workspaceId}.json`);
  }

  function persistRoute(route: PreviewRouteRecord) {
    writeJsonFile(getRouteStatePath(route.workspaceId), route);
    routes.set(route.workspaceId, route);
  }

  async function syncRoute(route: PreviewRouteRecord) {
    persistRoute(route);

    try {
      await edgeAdapter.upsert(route);
      return route;
    } catch (error) {
      const failedRoute = previewRouteRecordSchema.parse({
        ...route,
        lastError:
          error instanceof Error ? error.message : "Unknown route registration error.",
        proxyAdapter: edgeAdapter.name,
        status: "failed",
      });

      persistRoute(failedRoute);
      throw new RouteRegistrationError(
        `Failed to register preview route for ${route.workspaceId}.`,
        failedRoute,
        createPreviewRegistrationPayload(failedRoute),
      );
    }
  }

  return {
    async register(input: RegisterPreviewRouteInput) {
      const route = previewRouteRecordSchema.parse({
        workspaceId: input.workspaceId,
        host: input.host,
        target: input.target,
        targetPort: input.targetPort,
        protocol: input.protocol ?? "http",
        healthPath: input.healthPath ?? "/",
        healthStatus: input.healthStatus ?? "degraded",
        status: input.status ?? toRouteStatus(input.healthStatus ?? "degraded"),
        proxyAdapter: edgeAdapter.name,
        registeredAt: now().toISOString(),
        lastError: input.lastError ?? null,
      });

      const syncedRoute = await syncRoute(route);
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
        status: toRouteStatus(healthStatus),
      });

      const syncedRoute = await syncRoute(nextRoute);
      return createPreviewRegistrationPayload(syncedRoute);
    },

    get(workspaceId: string) {
      return routes.get(workspaceId) ?? null;
    },

    list() {
      return Array.from(routes.values());
    },

    edgeAdapterName() {
      return edgeAdapter.name;
    },
  };
}

export type RouteRegistry = ReturnType<typeof createRouteRegistry>;

export function createRouteRegistryBoundary(routeCount: number = 0) {
  return {
    name: "route-registry",
    note: "Registers stable preview hosts and writes developer edge manifests.",
    status: "ready",
    activeRoutes: routeCount,
  } as const;
}
