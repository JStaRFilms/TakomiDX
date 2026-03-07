import { createAgentRunInputSchema } from "@takomi/contracts";
import { NextResponse } from "next/server";
import { agentdFetch, readAgentdError } from "@/lib/agentd-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;

  try {
    const body = (await request.json()) as
      | { agentType?: string; budgetUsd?: number; warningBudgetUsd?: number | null }
      | null;
    const payload = createAgentRunInputSchema.parse({
      workspaceId,
      agentType: body?.agentType ?? "Operator session",
      budgetUsd: body?.budgetUsd ?? 5,
      warningBudgetUsd: body?.warningBudgetUsd ?? null,
    });
    const response = await agentdFetch("/api/v1/observability/runs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "run_start_failed",
          message: await readAgentdError(response),
        },
        { status: response.status },
      );
    }

    return NextResponse.json(await response.json(), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "run_start_failed",
        message:
          error instanceof Error ? error.message : "Run start failed unexpectedly.",
      },
      { status: 400 },
    );
  }
}
