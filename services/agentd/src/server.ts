import type { AgentdConfig } from "./config";
import {
  createRuntimeTarget,
  workspaceRuntimeConfigSchema,
} from "@takomi/contracts";
import { buildHealthPayload } from "./health";
import {
  AuthBrokerError,
  createAuthBroker,
  createAuthBrokerBoundary,
} from "./modules/auth-broker";
import {
  RouteRegistrationError,
  createRouteRegistry,
  createRouteRegistryBoundary,
} from "./modules/route-registry";
import { RuntimeBootError, createRuntimeExecutor, createRuntimeExecutorBoundary } from "./modules/runtime-executor";
import {
  WorkspaceLifecycleError,
  createWorkspaceManager,
  createWorkspaceManagerBoundary,
} from "./modules/workspace-manager";
import { createServer as createHttpServer, type IncomingMessage } from "node:http";

function json(body: unknown, init?: { status?: number }) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    status: init?.status ?? 200,
  });
}

function redirect(url: string, status: number = 302) {
  return new Response(null, {
    headers: {
      location: url,
    },
    status,
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
  const workspaceManager = createWorkspaceManager({
    previewDomain: config.previewDomain,
    stateDir: config.stateDir,
    workspacesDir: config.workspacesDir,
    worktreeRootDir: config.worktreeRootDir,
  });
  const runtimeExecutor = createRuntimeExecutor({
    workspacesDir: config.workspacesDir,
  });
  const routeRegistry = createRouteRegistry({
    routesDir: config.routesDir,
  });
  const authBroker = createAuthBroker({
    authBrokerHost: config.authBrokerHost,
    stateDir: config.stateDir,
  });

  return createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    let result: Response;
    const authCallbackMatch = url.pathname.match(
      /^\/callback\/([a-z0-9]+(?:[-_][a-z0-9]+)*)\/(ws_[a-z0-9]{8,})$/,
    );
    const authSessionMatch = url.pathname.match(
      /^\/api\/v1\/auth\/sessions\/(auth_[a-z0-9]{8,})$/,
    );
    const authRedeemMatch = url.pathname.match(
      /^\/api\/v1\/auth\/sessions\/(auth_[a-z0-9]{8,})\/redeem$/,
    );
    const authDeviceResolveMatch = url.pathname.match(
      /^\/api\/v1\/auth\/sessions\/(auth_[a-z0-9]{8,})\/device\/resolve$/,
    );
    const runtimeWorkspaceMatch = url.pathname.match(
      /^\/api\/v1\/runtime\/workspaces\/(ws_[a-z0-9]{8,})$/,
    );
    const refreshHealthMatch = url.pathname.match(
      /^\/api\/v1\/runtime\/workspaces\/(ws_[a-z0-9]{8,})\/refresh-health$/,
    );
    const workspaceMatch = url.pathname.match(
      /^\/api\/v1\/workspaces\/(ws_[a-z0-9]{8,})$/,
    );
    const workspaceArchiveMatch = url.pathname.match(
      /^\/api\/v1\/workspaces\/(ws_[a-z0-9]{8,})\/archive$/,
    );
    const workspaceDeleteMatch = url.pathname.match(
      /^\/api\/v1\/workspaces\/(ws_[a-z0-9]{8,})\/delete$/,
    );
    const workspaceEventsMatch = url.pathname.match(
      /^\/api\/v1\/workspaces\/(ws_[a-z0-9]{8,})\/events$/,
    );

    if (request.method === "GET" && url.pathname === "/healthz") {
      result = json({
        ...buildHealthPayload(config),
        boundaries: [
          createWorkspaceManagerBoundary(
            workspaceManager.list().length,
            workspaceManager.listEvents().length,
          ),
          createRuntimeExecutorBoundary(runtimeExecutor.list().length),
          createRouteRegistryBoundary(routeRegistry.list().length),
          createAuthBrokerBoundary(authBroker.list().length),
        ],
      });
    } else if (
      request.method === "GET" &&
      url.pathname === "/api/v1/auth/events"
    ) {
      result = json({
        items: authBroker.listEvents(url.searchParams.get("workspaceId") ?? undefined),
      });
    } else if (
      request.method === "GET" &&
      url.pathname === "/api/v1/auth/sessions"
    ) {
      result = json({
        items: authBroker.list(url.searchParams.get("workspaceId") ?? undefined),
      });
    } else if (request.method === "POST" && url.pathname === "/api/v1/auth/sessions") {
      try {
        const body = (await readJsonBody(request)) as
          | Record<string, unknown>
          | null;
        const workspaceId =
          typeof body?.workspaceId === "string" ? body.workspaceId : null;
        const provider = typeof body?.provider === "string" ? body.provider : null;
        const flow =
          body?.flow === "device_code" ? "device_code" : "browser_callback";

        if (!workspaceId || !provider) {
          throw new Error("workspaceId and provider are required.");
        }

        const workspace = workspaceManager.get(workspaceId);

        if (!workspace) {
          result = json(
            {
              error: "workspace_not_found",
              message: `No workspace is registered for ${workspaceId}.`,
            },
            { status: 404 },
          );
        } else if (flow === "device_code") {
          const device =
            body?.device && typeof body.device === "object" ? body.device : null;
          const ttlSeconds =
            typeof body?.ttlSeconds === "number" ? body.ttlSeconds : undefined;
          const forwardPath =
            typeof body?.forwardPath === "string" ? body.forwardPath : undefined;

          if (!device) {
            throw new Error("device flow requests require a device payload.");
          }

          result = json(
            authBroker.createDeviceSession({
              workspaceId,
              previewHost: workspace.previewHost,
              provider,
              device: device as never,
              ...(ttlSeconds !== undefined ? { ttlSeconds } : {}),
              ...(forwardPath ? { forwardPath } : {}),
            }),
            { status: 201 },
          );
        } else {
          const ttlSeconds =
            typeof body?.ttlSeconds === "number" ? body.ttlSeconds : undefined;
          const forwardPath =
            typeof body?.forwardPath === "string" ? body.forwardPath : undefined;

          result = json(
            authBroker.createBrowserSession({
              workspaceId,
              previewHost: workspace.previewHost,
              provider,
              ...(ttlSeconds !== undefined ? { ttlSeconds } : {}),
              ...(forwardPath ? { forwardPath } : {}),
            }),
            { status: 201 },
          );
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          result = json(
            {
              error: "invalid_json",
              message: "The request body must be valid JSON.",
            },
            { status: 400 },
          );
        } else if (error instanceof AuthBrokerError) {
          result = json(
            {
              error: error.code,
              message: error.message,
              detail: error.errorDetail,
              session: error.session,
            },
            { status: error.status },
          );
        } else if (error instanceof Error) {
          result = json(
            {
              error: "invalid_auth_request",
              message: error.message,
            },
            { status: 400 },
          );
        } else {
          result = json(
            {
              error: "auth_request_failed",
              message: "The auth session could not be created.",
            },
            { status: 500 },
          );
        }
      }
    } else if (request.method === "GET" && authSessionMatch) {
      const sessionId = authSessionMatch[1]!;
      const session = authBroker.get(sessionId);

      result = session
        ? json(session)
        : json(
            {
              error: "session_not_found",
              message: `No auth session is registered for ${sessionId}.`,
            },
            { status: 404 },
          );
    } else if (request.method === "POST" && authRedeemMatch) {
      try {
        const sessionId = authRedeemMatch[1]!;
        const body = (await readJsonBody(request)) as
          | Record<string, unknown>
          | null;
        const handoffToken =
          typeof body?.handoffToken === "string" ? body.handoffToken : null;

        if (!handoffToken) {
          throw new Error("handoffToken is required.");
        }

        result = json(
          authBroker.redeemCallback({
            sessionId,
            handoffToken,
          }),
        );
      } catch (error) {
        if (error instanceof SyntaxError) {
          result = json(
            {
              error: "invalid_json",
              message: "The request body must be valid JSON.",
            },
            { status: 400 },
          );
        } else if (error instanceof AuthBrokerError) {
          result = json(
            {
              error: error.code,
              message: error.message,
              detail: error.errorDetail,
              session: error.session,
            },
            { status: error.status },
          );
        } else if (error instanceof Error) {
          result = json(
            {
              error: "invalid_auth_request",
              message: error.message,
            },
            { status: 400 },
          );
        } else {
          result = json(
            {
              error: "auth_redeem_failed",
              message: "The auth handoff could not be redeemed.",
            },
            { status: 500 },
          );
        }
      }
    } else if (request.method === "POST" && authDeviceResolveMatch) {
      try {
        const sessionId = authDeviceResolveMatch[1]!;
        const body = (await readJsonBody(request)) as
          | Record<string, unknown>
          | null;
        const outcome =
          body?.outcome === "denied" || body?.outcome === "expired"
            ? body.outcome
            : "authorized";

        result = json(
          authBroker.resolveDeviceSession({
            sessionId,
            outcome,
          }),
        );
      } catch (error) {
        if (error instanceof SyntaxError) {
          result = json(
            {
              error: "invalid_json",
              message: "The request body must be valid JSON.",
            },
            { status: 400 },
          );
        } else if (error instanceof AuthBrokerError) {
          result = json(
            {
              error: error.code,
              message: error.message,
              detail: error.errorDetail,
              session: error.session,
            },
            { status: error.status },
          );
        } else if (error instanceof Error) {
          result = json(
            {
              error: "invalid_auth_request",
              message: error.message,
            },
            { status: 400 },
          );
        } else {
          result = json(
            {
              error: "auth_request_failed",
              message: "The device auth session could not be resolved.",
            },
            { status: 500 },
          );
        }
      }
    } else if (request.method === "GET" && authCallbackMatch) {
      try {
        const provider = authCallbackMatch[1]!;
        const workspaceId = authCallbackMatch[2]!;
        const resolution = authBroker.handleCallback({
          provider,
          workspaceId,
          state: url.searchParams.get("state"),
          code: url.searchParams.get("code"),
          error: url.searchParams.get("error"),
          errorDescription: url.searchParams.get("error_description"),
          errorUri: url.searchParams.get("error_uri"),
        });

        result = redirect(resolution.redirectUrl);
      } catch (error) {
        if (error instanceof AuthBrokerError && error.redirectUrl) {
          result = redirect(error.redirectUrl);
        } else if (error instanceof AuthBrokerError) {
          result = json(
            {
              error: error.code,
              message: error.message,
              detail: error.errorDetail,
              session: error.session,
            },
            { status: error.status },
          );
        } else if (error instanceof Error) {
          result = json(
            {
              error: "auth_callback_failed",
              message: error.message,
            },
            { status: 400 },
          );
        } else {
          result = json(
            {
              error: "auth_callback_failed",
              message: "The auth callback could not be processed.",
            },
            { status: 500 },
          );
        }
      }
    } else if (
      request.method === "GET" &&
      url.pathname === "/api/v1/workspaces/events"
    ) {
      result = json({
        items: workspaceManager.listEvents(),
      });
    } else if (request.method === "GET" && url.pathname === "/api/v1/workspaces") {
      result = json({
        items: workspaceManager.list(),
      });
    } else if (request.method === "POST" && url.pathname === "/api/v1/workspaces") {
      try {
        const body = await readJsonBody(request);
        const workspace = await workspaceManager.create(body ?? {});
        result = json(workspace, { status: 201 });
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          result = json(
            {
              error: error.code,
              message: error.message,
            },
            { status: error.status },
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
              error: "invalid_workspace_request",
              message: error.message,
            },
            { status: 400 },
          );
        } else {
          result = json(
            {
              error: "workspace_create_failed",
              message: "The workspace could not be created.",
            },
            { status: 500 },
          );
        }
      }
    } else if (request.method === "GET" && workspaceEventsMatch) {
      const workspaceId = workspaceEventsMatch[1]!;
      const workspace = workspaceManager.get(workspaceId);

      result = workspace
        ? json({
            items: workspaceManager.listEvents(workspaceId),
          })
        : json(
            {
              error: "workspace_not_found",
              message: `No workspace is registered for ${workspaceId}.`,
            },
            { status: 404 },
          );
    } else if (request.method === "GET" && workspaceMatch) {
      const workspaceId = workspaceMatch[1]!;
      const workspace = workspaceManager.get(workspaceId);

      result = workspace
        ? json(workspace)
        : json(
            {
              error: "workspace_not_found",
              message: `No workspace is registered for ${workspaceId}.`,
            },
            { status: 404 },
          );
    } else if (request.method === "POST" && workspaceArchiveMatch) {
      try {
        const workspaceId = workspaceArchiveMatch[1]!;
        const workspace = await workspaceManager.archive(workspaceId);
        result = json(workspace);
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          result = json(
            {
              error: error.code,
              message: error.message,
            },
            { status: error.status },
          );
        } else if (error instanceof Error) {
          result = json(
            {
              error: "workspace_archive_failed",
              message: error.message,
            },
            { status: 500 },
          );
        } else {
          result = json(
            {
              error: "workspace_archive_failed",
              message: "The workspace could not be archived.",
            },
            { status: 500 },
          );
        }
      }
    } else if (request.method === "POST" && workspaceDeleteMatch) {
      try {
        const workspaceId = workspaceDeleteMatch[1]!;
        const body = await readJsonBody(request);
        const deletion = await workspaceManager.delete(workspaceId, body ?? {});
        result = json(deletion);
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          result = json(
            {
              error: error.code,
              message: error.message,
            },
            { status: error.status },
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
              error: "workspace_delete_failed",
              message: error.message,
            },
            { status: 400 },
          );
        } else {
          result = json(
            {
              error: "workspace_delete_failed",
              message: "The workspace could not be deleted.",
            },
            { status: 500 },
          );
        }
      }
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
