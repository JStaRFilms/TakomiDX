import { NextResponse } from "next/server";
import { AgentdConnectionError, agentdFetch } from "@/lib/agentd-server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> },
) {
    try {
        const { workspaceId } = await params;

        const response = await agentdFetch(`/api/v1/workspaces/${workspaceId}/archive`, {
            method: "POST",
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorBody.error ?? "archive_failed", message: errorBody.message ?? "Archive operation failed." },
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

        console.error("Archive workspace failed:", error);
        return NextResponse.json(
            { error: "archive_failed", message: error instanceof Error ? error.message : "Archive operation failed." },
            { status: 500 },
        );
    }
}
