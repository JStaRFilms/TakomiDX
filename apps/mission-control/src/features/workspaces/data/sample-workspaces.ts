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
    id: "ws_auth0001",
    slug: "billing-auth-fix",
    repoName: "takomi/core",
    branch: "fix/billing-auth",
    agentType: "Claude Code",
    status: "running",
    lastAction: "Modified src/auth/callback.ts — added workspace routing logic. Running tests...",
    previewHost: createPreviewHost("billing-auth-fix", previewDomain),
    tokenCostUsd: 0.42,
    elapsedMinutes: 12,
    health: "healthy",
    auth: null,
  }),
  defineWorkspace({
    id: "ws_web00002",
    slug: "onboarding-flow",
    repoName: "takomi/web",
    branch: "feat/onboarding",
    agentType: "Gemini CLI",
    status: "awaiting_human",
    lastAction: "Approval needed: 14 files changed, database migration detected. Review bundle ready.",
    previewHost: createPreviewHost("onboarding-flow", previewDomain),
    tokenCostUsd: 1.83,
    elapsedMinutes: 34,
    health: "healthy",
    auth: null,
  }),
  defineWorkspace({
    id: "ws_api00003",
    slug: "rate-limiter",
    repoName: "takomi/api",
    branch: "feat/rate-limit",
    agentType: "Codex",
    status: "failed",
    lastAction: "TypeScript compilation failed — 3 type errors in middleware.ts affecting CoreRouter.",
    previewHost: createPreviewHost("rate-limiter", previewDomain),
    tokenCostUsd: 0.91,
    elapsedMinutes: 8,
    health: "failed",
    auth: null,
  }),
  defineWorkspace({
    id: "ws_docs0004",
    slug: "sync-api-docs",
    repoName: "takomi/docs",
    branch: "chore/sync-docs",
    agentType: "Claude Code",
    status: "completed",
    lastAction: "Updated 8 OpenAPI specifications. Changes merged to main.",
    previewHost: createPreviewHost("sync-api-docs", previewDomain),
    tokenCostUsd: 0.12,
    elapsedMinutes: 3,
    health: "healthy",
    auth: null,
  }),
  defineWorkspace({
    id: "ws_db000005",
    slug: "pgvector-index",
    repoName: "takomi/data",
    branch: "perf/pgvector",
    agentType: "Gemini CLI",
    status: "validating",
    lastAction: "Running load tests against new hnsw index on workspaces table...",
    previewHost: createPreviewHost("pgvector-index", previewDomain),
    tokenCostUsd: 3.45,
    elapsedMinutes: 45,
    health: "healthy",
    auth: null,
  }),
];
