import {
  createPreviewHost,
  type WorkspaceSummary,
  workspaceSummarySchema,
} from "@takomi/contracts";

const previewDomain = "takomi.localhost";

function defineWorkspace(workspace: WorkspaceSummary): WorkspaceSummary {
  return workspaceSummarySchema.parse(workspace);
}

export const sampleWorkspaces: WorkspaceSummary[] = [
  defineWorkspace({
    id: "ws_foundation1",
    slug: "foundation-shell",
    repoName: "takomidx",
    branch: "agent/foundation-shell",
    agentType: "codex",
    status: "running",
    lastAction: "Locking repo contracts and route boundaries for downstream tasks.",
    previewHost: createPreviewHost("foundation-shell", previewDomain),
    tokenCostUsd: 1.82,
    elapsedMinutes: 14,
    health: "healthy",
    auth: null,
  }),
  defineWorkspace({
    id: "ws_runtime01",
    slug: "runtime-routing",
    repoName: "takomidx",
    branch: "agent/runtime-routing",
    agentType: "claude-code",
    status: "queued",
    lastAction: "Waiting on foundation contracts before proxy and runtime tasks begin.",
    previewHost: createPreviewHost("runtime-routing", previewDomain),
    tokenCostUsd: 0,
    elapsedMinutes: 0,
    health: "degraded",
    auth: null,
  }),
  defineWorkspace({
    id: "ws_review001",
    slug: "review-loop",
    repoName: "takomidx",
    branch: "agent/review-loop",
    agentType: "gemini",
    status: "awaiting_human",
    lastAction: "Reserved detail route for validation bundles and approval actions.",
    previewHost: createPreviewHost("review-loop", previewDomain),
    tokenCostUsd: 0.64,
    elapsedMinutes: 6,
    health: "healthy",
    auth: null,
  }),
];
