import type { AgentdConfig } from "./config";
import { buildHealthPayload } from "./health";
import { createRouteRegistryBoundary } from "./modules/route-registry";
import { createRuntimeExecutorBoundary } from "./modules/runtime-executor";
import { createWorkspaceManagerBoundary } from "./modules/workspace-manager";
import { createServer as createHttpServer } from "node:http";

function json(body: unknown, init?: { status?: number }) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    status: init?.status ?? 200,
  });
}

export function createAgentdServer(config: AgentdConfig) {
  const boundaries = [
    createWorkspaceManagerBoundary(),
    createRuntimeExecutorBoundary(),
    createRouteRegistryBoundary(),
  ];

  return createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    let result: Response;

    if (request.method === "GET" && url.pathname === "/healthz") {
      result = json({
        ...buildHealthPayload(config),
        boundaries,
      });
    } else if (request.method === "GET" && url.pathname === "/api/v1/workspaces") {
      result = json({
        items: [],
        note: "Workspace lifecycle APIs land in downstream tasks.",
      });
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
