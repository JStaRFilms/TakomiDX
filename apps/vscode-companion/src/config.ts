import * as vscode from "vscode";

export interface TakomiExtensionConfig {
  agentdBaseUrl: string;
  missionControlBaseUrl: string;
  logsTail: number;
}

function normalizeBaseUrl(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  return trimmed.replace(/\/+$/, "");
}

export function readTakomiConfig(): TakomiExtensionConfig {
  const config = vscode.workspace.getConfiguration("takomi");
  const logsTail = config.get<number>("logsTail", 120);

  return {
    agentdBaseUrl: normalizeBaseUrl(
      config.get<string>("agentdBaseUrl"),
      "http://127.0.0.1:4000",
    ),
    missionControlBaseUrl: normalizeBaseUrl(
      config.get<string>("missionControlBaseUrl"),
      "http://127.0.0.1:3000",
    ),
    logsTail: Number.isFinite(logsTail) ? Math.min(400, Math.max(20, logsTail)) : 120,
  };
}
