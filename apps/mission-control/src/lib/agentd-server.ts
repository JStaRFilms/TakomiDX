import type { WorkspaceMetadata, WorkspaceRuntimeState } from "@takomi/contracts";
import { resolveMissionControlEnv } from "@/lib/env";

function getAgentdBaseUrl() {
  return resolveMissionControlEnv().public.NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL;
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
  return fetch(`${getAgentdBaseUrl()}${pathname}`, {
    cache: "no-store",
    ...init,
  });
}

export async function agentdFetchJson<T>(
  pathname: string,
  init?: RequestInit,
): Promise<T> {
  const response = await agentdFetch(pathname, init);

  if (!response.ok) {
    throw new Error(await readAgentdError(response));
  }

  return (await response.json()) as T;
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
