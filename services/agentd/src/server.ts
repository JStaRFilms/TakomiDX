import type { AgentdConfig } from "./config";
import {
  createRuntimeTarget,
  workspaceRuntimeConfigSchema,
} from "@takomi/contracts";
import { buildHealthPayload } from "./health";
import {
  RouteRegistrationError,
  createRouteRegistry,
  createRouteRegistryBoundary,
} from "./modules/route-registry";
import {
  RuntimeBootError,
  createRuntimeExecutor,
  createRuntimeExecutorBoundary,
} from "./modules/runtime-executor";
import { createWorkspaceManagerBoundary } from "./modules/workspace-manager";
import { createServer as createHttpServer, type IncomingMessage } from "node:http";

function json(body: unknown, init?: { status?: number }) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    status: init?.status ?? 200,
  });
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createAgentdServer(config: AgentdConfig) {
  const runtimeExecutor = createRuntimeExecutor({
    workspacesDir: config.workspacesDir,
  });
  const routeRegistry = createRouteRegistry({
    routesDir: config.routesDir,
  });

  return createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    let result: Response;
    const runtimeWorkspaceMatch = url.pathname.match(
      /^\/api\/v1\/runtime\/workspaces\/(ws_[a-z0-9]{8,})$/,
    );
    const refreshHealthMatch = url.pathname.match(
      /^\/api\/v1\/runtime\/workspaces\/(ws_[a-z0-9]{8,})\/refresh-health$/,
    );

    if (request.method === "GET" && url.pathname === "/healthz") {
      result = json({
        ...buildHealthPayload(config),
        boundaries: [
          createWorkspaceManagerBoundary(),
          createRuntimeExecutorBoundary(runtimeExecutor.list().length),
          createRouteRegistryBoundary(routeRegistry.list().length),
        ],
      });
    } else if (request.method === "GET" && url.pathname === "/api/v1/workspaces") {
      result = json({
        items: [],
        note: "Workspace lifecycle APIs land in downstream tasks.",
      });
    } else if (
      request.method === "GET" &&
      url.pathname === "/api/v1/runtime/workspaces"
    ) {
      result = json({
        items: runtimeExecutor.list(),
      });
    } else if (request.method === "GET" && url.pathname === "/api/v1/runtime/routes") {
      result = json({
        items: routeRegistry.list(),
      });
    } else if (request.method === "GET" && runtimeWorkspaceMatch) {
      const workspaceId = runtimeWorkspaceMatch[1]!;
      const runtime = runtimeExecutor.get(workspaceId);

      result = runtime
        ? json(runtime)
        : json(
            {
              error: "not_found",
              message: `No runtime is registered for ${workspaceId}.`,
            },
            { status: 404 },
          );
    } else if (request.method === "POST" && url.pathname === "/api/v1/runtime/boot") {
      try {
        const body = await readJsonBody(request);
        const configInput = workspaceRuntimeConfigSchema.parse(body);
        const runtime = await runtimeExecutor.boot(configInput);

        try {
          const preview = await routeRegistry.register({
            workspaceId: runtime.workspaceId,
            host: configInput.previewHost,
            target: createRuntimeTarget(runtime.assignedHostPort ?? 0),
            targetPort: runtime.assignedHostPort ?? 0,
            protocol: configInput.port.protocol,
            healthPath: configInput.healthCheckPath,
            healthStatus: runtime.healthStatus,
            lastError: runtime.lastError,
          });

          result = json(runtimeExecutor.attachPreview(runtime.workspaceId, preview), {
            status: 201,
          });
        } catch (error) {
          if (error instanceof RouteRegistrationError) {
            const failedRuntime =
              runtimeExecutor.attachPreview(runtime.workspaceId, error.payload) ??
              runtime;

            result = json(
              {
                error: "route_registration_failed",
                message: error.message,
                runtime: failedRuntime,
                route: error.route,
              },
              { status: 502 },
            );
          } else {
            throw error;
          }
        }
      } catch (error) {
        if (error instanceof RuntimeBootError) {
          result = json(
            {
              error: "runtime_boot_failed",
              message: error.message,
              runtime: error.state,
            },
            { status: 502 },
          );
        } else if (error instanceof SyntaxError) {
          result = json(
            {
              error: "invalid_json",
              message: "The request body must be valid JSON.",
            },
            { status: 400 },
          );
        } else if (error instanceof Error) {
          result = json(
            {
              error: "invalid_runtime_request",
              message: error.message,
            },
            { status: 400 },
          );
        } else {
          result = json(
            {
              error: "runtime_boot_failed",
              message: "The runtime could not be started.",
            },
            { status: 502 },
          );
        }
      }
    } else if (request.method === "POST" && refreshHealthMatch) {
      const workspaceId = refreshHealthMatch[1]!;
      const runtime = await runtimeExecutor.refreshHealth(workspaceId);

      if (!runtime) {
        result = json(
          {
            error: "not_found",
            message: `No runtime is registered for ${workspaceId}.`,
          },
          { status: 404 },
        );
      } else {
        try {
          const preview = await routeRegistry.updateHealth(
            workspaceId,
            runtime.healthStatus,
            runtime.lastError,
          );
          const updatedRuntime =
            preview && runtime.preview
              ? runtimeExecutor.attachPreview(workspaceId, preview)
              : runtime;

          result = json(updatedRuntime ?? runtime);
        } catch (error) {
          if (error instanceof RouteRegistrationError) {
            const updatedRuntime =
              runtimeExecutor.attachPreview(workspaceId, error.payload) ?? runtime;

            result = json(
              {
                error: "route_registration_failed",
                message: error.message,
                runtime: updatedRuntime,
                route: error.route,
              },
              { status: 502 },
            );
          } else {
            throw error;
          }
        }
      }
    } else {
      result = json(
        {
          error: "not_found",
          message: "No route is registered for this path in the scaffold.",
        },
        { status: 404 },
      );
    }

    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(await result.text());
  });
}
