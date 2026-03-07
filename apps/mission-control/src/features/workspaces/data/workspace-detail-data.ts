import type { WorkspaceSummary } from "@takomi/contracts";
import { sampleWorkspaces } from "./sample-workspaces";

export interface WorkspaceActivityItem {
  timestamp: string;
  kind: "lifecycle" | "tool" | "policy" | "validation";
  title: string;
  detail: string;
}

export interface WorkspaceTraceItem {
  span: string;
  tool: string;
  status: "running" | "ok" | "warn" | "failed";
  duration: string;
  summary: string;
}

export interface WorkspaceLogItem {
  timestamp: string;
  stream: "stdout" | "stderr" | "system";
  line: string;
}

export interface WorkspaceDiffItem {
  path: string;
  change: "added" | "modified" | "deleted";
  summary: string;
}

export interface WorkspaceValidationItem {
  label: string;
  status: "queued" | "running" | "passed" | "failed" | "blocked";
  detail: string;
}

export interface WorkspaceDetailModel {
  mission: string;
  currentAction: string;
  nextAction: string;
  nextActionDetail: string;
  operatorNote: string;
  approvalPrompt: string | null;
  failurePrompt: string | null;
  previewState: "live" | "warming" | "offline";
  activity: WorkspaceActivityItem[];
  trace: WorkspaceTraceItem[];
  logs: WorkspaceLogItem[];
  diff: WorkspaceDiffItem[];
  validation: WorkspaceValidationItem[];
}

const workspaceDetails: Record<string, WorkspaceDetailModel> = {
  ws_auth0001: {
    mission: "Restore workspace-aware auth callback handling for the billing flow.",
    currentAction:
      "Routing callback traffic through the workspace host and re-running focused auth tests.",
    nextAction: "Review callback diff and open the live preview.",
    nextActionDetail:
      "The agent has a healthy runtime and preview. Supervision should focus on validating the callback path and approving the final patch once tests settle.",
    operatorNote:
      "Workspace billing-auth-fix is healthy and actively changing request routing. The main risk is redirect drift between auth broker and preview host.",
    approvalPrompt: null,
    failurePrompt: null,
    previewState: "live",
    activity: [
      {
        timestamp: "13:02",
        kind: "tool",
        title: "Edited auth callback",
        detail: "Patched src/auth/callback.ts to preserve workspace identity across redirects.",
      },
      {
        timestamp: "12:58",
        kind: "validation",
        title: "Focused test run",
        detail: "Queued callback and session broker tests after the routing patch.",
      },
      {
        timestamp: "12:54",
        kind: "lifecycle",
        title: "Preview reloaded",
        detail: "Workspace preview host was re-attached after the dev server restarted.",
      },
    ],
    trace: [
      {
        span: "trace-auth-07",
        tool: "apply_patch",
        status: "ok",
        duration: "18s",
        summary: "Inserted workspace slug into callback handoff state.",
      },
      {
        span: "trace-auth-08",
        tool: "pnpm test",
        status: "running",
        duration: "1m 42s",
        summary: "Running auth callback regression suite.",
      },
    ],
    logs: [
      {
        timestamp: "13:03:10",
        stream: "stdout",
        line: "GET /auth/callback?code=dev-mock 200 84ms",
      },
      {
        timestamp: "13:03:12",
        stream: "system",
        line: "Workspace proxy confirmed route billing-auth-fix.takomi.localhost -> 127.0.0.1:3017",
      },
      {
        timestamp: "13:03:14",
        stream: "stdout",
        line: "PASS auth/callback-routing.test.ts",
      },
    ],
    diff: [
      {
        path: "src/auth/callback.ts",
        change: "modified",
        summary: "Preserves workspace slug when building callback redirect targets.",
      },
      {
        path: "src/auth/callback-routing.test.ts",
        change: "modified",
        summary: "Adds regression coverage for workspace-aware callback state.",
      },
    ],
    validation: [
      {
        label: "Auth callback tests",
        status: "running",
        detail: "Focused regression suite is in progress against the patched callback flow.",
      },
      {
        label: "Preview smoke",
        status: "queued",
        detail: "Open the preview host and confirm the billing sign-in loop resolves cleanly.",
      },
    ],
  },
  ws_web00002: {
    mission: "Ship the onboarding flow changes without surprising the operator with an unsafe migration.",
    currentAction:
      "Agent is paused with a review bundle after detecting a schema migration and 14 changed files.",
    nextAction: "Review the proposed migration before approving workspace execution.",
    nextActionDetail:
      "This workspace is blocked on human approval. Focus on the migration impact, then either approve payload execution or redirect the agent to split the database work.",
    operatorNote:
      "Workspace onboarding-flow is attributable and safe to supervise: the risky action is already isolated and clearly labeled.",
    approvalPrompt:
      "Workspace onboarding-flow is awaiting approval for a migration-bearing payload.",
    failurePrompt: null,
    previewState: "live",
    activity: [
      {
        timestamp: "12:49",
        kind: "tool",
        title: "Generated migration",
        detail: "Detected schema drift while expanding onboarding profile fields.",
      },
      {
        timestamp: "12:45",
        kind: "policy",
        title: "Policy pause",
        detail: "Execution paused because the diff includes a migration and cross-cutting UI changes.",
      },
      {
        timestamp: "12:37",
        kind: "lifecycle",
        title: "Workspace resumed",
        detail: "Rehydrated the existing onboarding worktree for continued agent edits.",
      },
    ],
    trace: [
      {
        span: "trace-web-14",
        tool: "prisma migrate dev",
        status: "warn",
        duration: "33s",
        summary: "Created a new migration that requires operator approval.",
      },
      {
        span: "trace-web-15",
        tool: "git diff --stat",
        status: "ok",
        duration: "4s",
        summary: "Prepared review bundle with 14 files changed.",
      },
    ],
    logs: [
      {
        timestamp: "12:49:02",
        stream: "stdout",
        line: "Migration generated: 20260307_expand_onboarding_profile",
      },
      {
        timestamp: "12:49:08",
        stream: "system",
        line: "Execution paused pending approval for onboarding-flow.",
      },
      {
        timestamp: "12:49:10",
        stream: "stdout",
        line: "Review bundle staged with screenshots and schema diff summary.",
      },
    ],
    diff: [
      {
        path: "prisma/migrations/20260307_expand_onboarding_profile/migration.sql",
        change: "added",
        summary: "Adds onboarding profile columns and a backfill statement.",
      },
      {
        path: "app/onboarding/page.tsx",
        change: "modified",
        summary: "Updates onboarding copy and profile completion states.",
      },
    ],
    validation: [
      {
        label: "Migration review",
        status: "blocked",
        detail: "A human must approve the schema change before runtime execution continues.",
      },
      {
        label: "Preview walkthrough",
        status: "queued",
        detail: "Preview is live and ready for a supervised onboarding smoke test.",
      },
    ],
  },
  ws_api00003: {
    mission: "Recover the rate-limiter branch after a TypeScript break in middleware.",
    currentAction:
      "Agent stopped after three type errors surfaced in middleware.ts and blocked router compilation.",
    nextAction: "Inspect the failing middleware patch and restart only after the type surface is corrected.",
    nextActionDetail:
      "This workspace is failed. The highest-value supervision step is to review the broken types and either restart the agent with a narrower repair scope or terminate the run.",
    operatorNote:
      "Workspace rate-limiter failed fast and preserved the failing context. The error is attributable to middleware typing, not runtime flakiness.",
    approvalPrompt: null,
    failurePrompt:
      "Workspace rate-limiter is failed and needs operator intervention before it can resume.",
    previewState: "offline",
    activity: [
      {
        timestamp: "12:31",
        kind: "tool",
        title: "Type check failed",
        detail: "Three errors surfaced while wiring rate-limit context into CoreRouter middleware.",
      },
      {
        timestamp: "12:29",
        kind: "tool",
        title: "Edited middleware",
        detail: "Introduced new request-scoped rate-limit metadata types.",
      },
      {
        timestamp: "12:27",
        kind: "lifecycle",
        title: "Runtime halted",
        detail: "Container stayed healthy, but the agent stopped on compile failure.",
      },
    ],
    trace: [
      {
        span: "trace-api-03",
        tool: "pnpm typecheck",
        status: "failed",
        duration: "21s",
        summary: "Type mismatch between router middleware and request context payload.",
      },
      {
        span: "trace-api-04",
        tool: "git diff",
        status: "ok",
        duration: "3s",
        summary: "Captured the failing middleware patch for review.",
      },
    ],
    logs: [
      {
        timestamp: "12:31:11",
        stream: "stderr",
        line: "middleware.ts(88,13): Type 'RateLimitState | undefined' is not assignable to type 'RateLimitState'.",
      },
      {
        timestamp: "12:31:11",
        stream: "stderr",
        line: "middleware.ts(121,7): Property 'windowMs' does not exist on type 'LimiterPolicy'.",
      },
      {
        timestamp: "12:31:13",
        stream: "system",
        line: "Agent execution halted after compile failure in workspace rate-limiter.",
      },
    ],
    diff: [
      {
        path: "src/http/middleware.ts",
        change: "modified",
        summary: "Introduces request rate-limit context and stricter router metadata typing.",
      },
      {
        path: "src/http/core-router.ts",
        change: "modified",
        summary: "Reads middleware-provided rate-limit metadata for request decisions.",
      },
    ],
    validation: [
      {
        label: "TypeScript compile",
        status: "failed",
        detail: "Compile must pass before the agent can be safely restarted.",
      },
      {
        label: "API smoke",
        status: "blocked",
        detail: "Runtime validation is blocked until the middleware types are corrected.",
      },
    ],
  },
  ws_docs0004: {
    mission: "Synchronize API docs with the latest contracts and merge the review-safe update.",
    currentAction:
      "Documentation sync is complete. The workspace is retained for auditability and follow-up review.",
    nextAction: "Review the generated docs diff and archive when supervision is complete.",
    nextActionDetail:
      "There is no active risk here. The main operator task is a quick review for wording or drift before archiving the workspace.",
    operatorNote:
      "Workspace sync-api-docs is complete and safe. Remaining work is lightweight review rather than intervention.",
    approvalPrompt: null,
    failurePrompt: null,
    previewState: "offline",
    activity: [
      {
        timestamp: "11:58",
        kind: "validation",
        title: "Spec sync complete",
        detail: "Updated eight OpenAPI files and linked generated docs snippets.",
      },
      {
        timestamp: "11:52",
        kind: "tool",
        title: "Generated docs",
        detail: "Ran contract export and markdown regeneration scripts.",
      },
    ],
    trace: [
      {
        span: "trace-docs-11",
        tool: "pnpm docs:sync",
        status: "ok",
        duration: "52s",
        summary: "Regenerated OpenAPI and markdown references.",
      },
    ],
    logs: [
      {
        timestamp: "11:58:02",
        stream: "stdout",
        line: "Updated 8 OpenAPI specs and 3 markdown reference pages.",
      },
    ],
    diff: [
      {
        path: "docs/openapi/billing.yaml",
        change: "modified",
        summary: "Refreshes auth callback schemas and examples.",
      },
      {
        path: "docs/reference/auth.md",
        change: "modified",
        summary: "Matches the current auth broker contract behavior.",
      },
    ],
    validation: [
      {
        label: "Docs generation",
        status: "passed",
        detail: "Sync scripts completed and produced stable output.",
      },
    ],
  },
  ws_db000005: {
    mission: "Validate the new pgvector HNSW index under realistic query load.",
    currentAction:
      "Workspace is running validation load tests against the new workspaces table index.",
    nextAction: "Watch validation throughput and only promote the index if latency stays inside budget.",
    nextActionDetail:
      "This workspace is active but not waiting on approval. The main supervision task is reviewing validation output and opening the trace/log surfaces for anomalies.",
    operatorNote:
      "Workspace pgvector-index is a validation run, so the key signal is trace and benchmark output rather than preview behavior.",
    approvalPrompt: null,
    failurePrompt: null,
    previewState: "warming",
    activity: [
      {
        timestamp: "12:16",
        kind: "validation",
        title: "Load test started",
        detail: "Benchmarking query throughput with 500k embeddings against the HNSW index.",
      },
      {
        timestamp: "12:11",
        kind: "tool",
        title: "Index created",
        detail: "Applied the new HNSW index to the workspaces vector search table.",
      },
    ],
    trace: [
      {
        span: "trace-db-22",
        tool: "psql",
        status: "ok",
        duration: "12s",
        summary: "Created HNSW index and confirmed planner visibility.",
      },
      {
        span: "trace-db-23",
        tool: "pnpm benchmark:vectors",
        status: "running",
        duration: "6m 11s",
        summary: "Streaming latency percentiles for vector similarity workloads.",
      },
    ],
    logs: [
      {
        timestamp: "12:16:44",
        stream: "stdout",
        line: "P95 latency 41ms after warmup, target budget 50ms.",
      },
      {
        timestamp: "12:16:51",
        stream: "stdout",
        line: "Throughput plateau reached at 320 req/s with 0 errors.",
      },
    ],
    diff: [
      {
        path: "db/indexes/workspaces_vector.sql",
        change: "modified",
        summary: "Adds HNSW configuration for faster vector retrieval.",
      },
      {
        path: "scripts/benchmarks/vector-index.ts",
        change: "modified",
        summary: "Captures additional latency histograms during validation.",
      },
    ],
    validation: [
      {
        label: "Vector benchmark",
        status: "running",
        detail: "Collecting latency and throughput data for promotion review.",
      },
      {
        label: "Planner verification",
        status: "passed",
        detail: "Explain analyze confirms the new index is selected.",
      },
    ],
  },
};

export function getWorkspace(workspaceId: string): WorkspaceSummary | null {
  return sampleWorkspaces.find((workspace) => workspace.id === workspaceId) ?? null;
}

export function getWorkspaceDetail(workspaceId: string): WorkspaceDetailModel | null {
  return workspaceDetails[workspaceId] ?? null;
}
