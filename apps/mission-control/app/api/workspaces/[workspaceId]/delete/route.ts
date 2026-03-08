import { NextResponse } from "next/server";
import { AgentdConnectionError, agentdFetch } from "@/lib/agentd-server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    try {
        const { workspaceId } = await params;
        const body = await request.json();

        const response = await agentdFetch(`/api/v1/workspaces/${workspaceId}/delete`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorBody.error ?? "delete_failed", message: errorBody.message ?? "Delete operation failed." },
                { status: response.status },
            );
        }

        const result = await response.json();
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        if (error instanceof AgentdConnectionError) {
            return NextResponse.json(
                { error: "agentd_unavailable", message: "The runtime daemon is currently unavailable. Please wait a moment and try again.", retryable: true },
                { status: 503 },
            );
        }

        console.error("Delete workspace failed:", error);
        return NextResponse.json(
            { error: "delete_failed", message: error instanceof Error ? error.message : "Delete operation failed." },
            { status: 500 },
        );
    }
}
