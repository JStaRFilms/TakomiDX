import { NextResponse } from "next/server";
import { agentdFetch, readAgentdError } from "@/lib/agentd-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;

  try {
    const response = await agentdFetch(
      `/api/v1/validation/workspaces/${workspaceId}/run`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{}",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "validation_run_failed",
          message: await readAgentdError(response),
        },
        { status: response.status },
      );
    }

    return NextResponse.json(await response.json(), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "validation_run_failed",
        message:
          error instanceof Error
            ? error.message
            : "Validation run failed unexpectedly.",
      },
      { status: 400 },
    );
  }
}
