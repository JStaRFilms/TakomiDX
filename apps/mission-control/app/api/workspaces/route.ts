import { createWorkspaceInputSchema } from "@takomi/contracts";
import { NextResponse } from "next/server";
import { agentdFetch } from "@/lib/agentd-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = createWorkspaceInputSchema.parse(body);
    const response = await agentdFetch("/api/v1/workspaces", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "workspace_create_failed",
        message:
          error instanceof Error
            ? error.message
            : "Workspace creation failed unexpectedly.",
      },
      { status: 400 },
    );
  }
}
