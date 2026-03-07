import { NextResponse } from "next/server";
import { agentdFetch, readAgentdError } from "@/lib/agentd-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
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
}
