import { createWorkspaceInputSchema } from "@takomi/contracts";
import { NextResponse } from "next/server";
import { resolveMissionControlEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = createWorkspaceInputSchema.parse(body);
    const env = resolveMissionControlEnv();
    const response = await fetch(
      `${env.public.NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL}/api/v1/workspaces`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );
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
