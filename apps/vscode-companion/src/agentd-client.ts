import {
  editorCompanionWorkspaceDetailResponseSchema,
  editorCompanionWorkspaceListResponseSchema,
  type EditorCompanionWorkspaceDetail,
  type EditorCompanionWorkspaceItem,
} from "@takomi/contracts";
import type { TakomiExtensionConfig } from "./config";

export interface RuntimeLogsResponse {
  workspaceId: string;
  containerName: string | null;
  lifecycle: string;
  tail: number;
  logs: string;
}

function isRuntimeLogsResponse(value: unknown): value is RuntimeLogsResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RuntimeLogsResponse>;
  return (
    typeof candidate.workspaceId === "string" &&
    typeof candidate.lifecycle === "string" &&
    typeof candidate.tail === "number" &&
    typeof candidate.logs === "string"
  );
}

export class TakomiAgentdClient {
  constructor(private readonly getConfig: () => TakomiExtensionConfig) { }

  private buildUrl(pathname: string) {
    return `${this.getConfig().agentdBaseUrl}${pathname}`;
  }

  private async requestJson<T>(
    pathname: string,
    parse: (value: unknown) => T,
  ): Promise<T> {
    const response = await fetch(this.buildUrl(pathname), {
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(5_000),
    });

    const payload = (await response.json()) as { message?: string } | unknown;

    if (!response.ok) {
      const message =
        typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
          ? payload.message
          : `TakomiDX agentd request failed with ${response.status}.`;

      throw new Error(message);
    }

    return parse(payload);
  }

  async listWorkspaces(): Promise<EditorCompanionWorkspaceItem[]> {
    return this.requestJson("/api/v1/editor/workspaces", (value) =>
      editorCompanionWorkspaceListResponseSchema.parse(value).items,
    );
  }

  async getWorkspaceDetail(
    workspaceId: string,
  ): Promise<EditorCompanionWorkspaceDetail> {
    return this.requestJson(`/api/v1/editor/workspaces/${workspaceId}`, (value) =>
      editorCompanionWorkspaceDetailResponseSchema.parse(value).item,
    );
  }

  async getWorkspaceLogs(
    workspaceId: string,
    tail: number,
  ): Promise<RuntimeLogsResponse> {
    return this.requestJson(
      `/api/v1/runtime/workspaces/${workspaceId}/logs?tail=${tail}`,
      (value) => {
        if (!isRuntimeLogsResponse(value)) {
          throw new Error("TakomiDX agentd returned an invalid logs payload.");
        }

        return value;
      },
    );
  }
}
