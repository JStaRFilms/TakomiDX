import type { WorkspaceMetadata, WorkspaceRuntimeState } from "@takomi/contracts";
import { resolveMissionControlEnv } from "@/lib/env";

function getAgentdBaseUrl() {
  return resolveMissionControlEnv().public.NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL;
}

export class AgentdConnectionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AgentdConnectionError";
  }
}

export function isAgentdConnectionError(error: unknown): error is AgentdConnectionError {
  return error instanceof AgentdConnectionError;
}

export async function readAgentdError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? `Agentd request failed with ${response.status}.`;
  } catch {
    return `Agentd request failed with ${response.status}.`;
  }
}

export async function agentdFetch(
  pathname: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = getAgentdBaseUrl();

  try {
    return await fetch(`${baseUrl}${pathname}`, {
      cache: "no-store",
      ...init,
    });
  } catch (error) {
    // Convert fetch network errors to a typed error we can handle
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new AgentdConnectionError(
        `Mission Control could not reach agentd at ${baseUrl}. The daemon may be unavailable or restarting.`,
        error,
      );
    }
    throw error;
  }
}

export async function agentdFetchJson<T>(
  pathname: string,
  init?: RequestInit,
): Promise<T> {
  try {
    const response = await agentdFetch(pathname, init);

    if (!response.ok) {
      throw new Error(await readAgentdError(response));
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AgentdConnectionError) {
      // Re-throw connection errors to be handled by callers
      throw error;
    }
    if (error instanceof Error && error.message.includes("fetch")) {
      throw new AgentdConnectionError(
        `Mission Control could not reach agentd. The daemon may be unavailable.`,
        error,
      );
    }
    throw error;
  }
}

export async function getWorkspaceMetadata(workspaceId: string) {
  return agentdFetchJson<WorkspaceMetadata>(`/api/v1/workspaces/${workspaceId}`);
}

export async function getWorkspaceRuntimeMetadata(workspaceId: string) {
  const response = await agentdFetch(`/api/v1/runtime/workspaces/${workspaceId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readAgentdError(response));
  }

  return (await response.json()) as WorkspaceRuntimeState;
}

export function splitCommandText(input: string) {
  const parts = input.match(/"([^"]*)"|'([^']*)'|[^\s]+/g) ?? [];

  return parts
    .map((part) => part.replace(/^['"]|['"]$/g, "").trim())
    .filter(Boolean);
}
