import { NextResponse } from "next/server";
import {
  agentdFetch,
  getWorkspaceMetadata,
  getWorkspaceRuntimeMetadata,
  readAgentdError,
  splitCommandText,
} from "@/lib/agentd-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;

  try {
    const body = (await request.json()) as
      | {
          image?: string;
          command?: string;
          containerPort?: number;
          healthCheckPath?: string;
        }
      | null;
    const workspace = await getWorkspaceMetadata(workspaceId);
    const existingRuntime = await getWorkspaceRuntimeMetadata(workspaceId);

    if (
      existingRuntime &&
      existingRuntime.lifecycle !== "failed" &&
      existingRuntime.lifecycle !== "stopped"
    ) {
      return NextResponse.json(
        {
          error: "runtime_already_active",
          message: `Runtime is already ${existingRuntime.lifecycle} for ${workspace.slug}.`,
        },
        { status: 409 },
      );
    }

    const repoPath = workspace.worktreePath ?? workspace.repoPath;
    const command = splitCommandText(
      body?.command ??
        'sh -lc "corepack enable && pnpm install && pnpm dev --hostname 0.0.0.0 --port 3000"',
    );

    if (command.length === 0) {
      throw new Error("Runtime command cannot be empty.");
    }

    const payload = {
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      repoPath,
      previewHost: workspace.previewHost,
      runtimeType: "container" as const,
      container: {
        image: body?.image?.trim() || "node:22-alpine",
        command,
        workdir: "/workspace",
      },
      env: {},
      port: {
        containerPort: body?.containerPort ?? 3000,
        protocol: "http" as const,
      },
      healthCheckPath: body?.healthCheckPath?.trim() || "/",
    };
    const response = await agentdFetch("/api/v1/runtime/boot", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "runtime_start_failed",
          message: await readAgentdError(response),
        },
        { status: response.status },
      );
    }

    return NextResponse.json(await response.json(), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "runtime_start_failed",
        message:
          error instanceof Error
            ? error.message
            : "Runtime start failed unexpectedly.",
      },
      { status: 400 },
    );
  }
}
