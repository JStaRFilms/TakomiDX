import { NextResponse } from "next/server";
import { agentdFetch, AgentdConnectionError, readAgentdError } from "@/lib/agentd-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;

  try {
    const response = await agentdFetch(
      `/api/v1/runtime/workspaces/${workspaceId}/refresh-health`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "runtime_refresh_failed",
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
        error: "runtime_refresh_failed",
        message: error instanceof Error ? error.message : "Failed to refresh runtime health.",
      },
      { status: 500 },
    );
  }
}
