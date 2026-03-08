import { NextResponse } from "next/server";
import { agentdFetch, AgentdConnectionError, readAgentdError } from "@/lib/agentd-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  const url = new URL(request.url);
  const tail = Math.max(20, Math.min(200, Number(url.searchParams.get("tail") ?? "80") || 80));

  try {
    const response = await agentdFetch(
      `/api/v1/runtime/workspaces/${workspaceId}/logs?tail=${tail}`,
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "runtime_logs_failed",
          message: await readAgentdError(response),
        },
        { status: response.status },
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    // Handle connection errors gracefully instead of crashing
    if (error instanceof AgentdConnectionError) {
      return NextResponse.json(
        {
          error: "agentd_unavailable",
          message: "The runtime daemon is currently unavailable. Please wait a moment and try again.",
          retryable: true,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: "runtime_logs_failed",
        message: error instanceof Error ? error.message : "Failed to retrieve runtime logs.",
      },
      { status: 500 },
    );
  }
}
