import { NextResponse } from "next/server";
import { agentdFetch, readAgentdError } from "@/lib/agentd-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  const url = new URL(request.url);
  const tail = Math.max(20, Math.min(200, Number(url.searchParams.get("tail") ?? "80") || 80));
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
}
