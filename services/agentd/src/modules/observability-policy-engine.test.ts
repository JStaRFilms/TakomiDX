import {
  createPreviewHost,
  type WorkspaceRuntimeConfig,
} from "@takomi/contracts";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAuthBroker } from "./auth-broker";
import { createObservabilityPolicyEngine } from "./observability-policy-engine";
import { createRuntimeExecutor, type ContainerRuntimeDriver } from "./runtime-executor";
import { createWorkspaceManager, type GitWorktreeDriver } from "./workspace-manager";

const tempDirs: string[] = [];

function createTempDir() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "takomi-observability-"));
  tempDirs.push(directory);
  return directory;
}

function createClock() {
  let tick = 0;

  return () => new Date(Date.UTC(2026, 2, 7, 3, 7, 31 + tick++));
}

function createRuntimeConfig(
  workspaceId: string,
  workspaceSlug: string,
  repoPath: string,
): WorkspaceRuntimeConfig {
  return {
    workspaceId,
    workspaceSlug,
    repoPath,
    previewHost: createPreviewHost(workspaceSlug, "takomi.localhost"),
    runtimeType: "container",
    container: {
      image: "node:22-alpine",
      command: ["pnpm", "dev"],
      workdir: "/workspace",
    },
    env: {},
    port: {
      containerPort: 3000,
      protocol: "http",
    },
    healthCheckPath: "/healthz",
  };
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("observability policy engine", () => {
  it("emits structured events for workspace, runtime, auth, and validation transitions", async () => {
    const root = createTempDir();
    const now = createClock();
    let eventCounter = 0;
    let runCounter = 0;
    let decisionCounter = 0;
    let spanCounter = 0;
    let traceCounter = 0;
    const repoPath = path.join(root, "repo");
    mkdirSync(repoPath, { recursive: true });

    const engine = createObservabilityPolicyEngine({
      runsDir: path.join(root, "runs"),
      stateDir: path.join(root, "state"),
      now,
      eventIdGenerator: () => `evt_${String(++eventCounter).padStart(8, "0")}`,
      runIdGenerator: () => `run_${String(++runCounter).padStart(8, "0")}`,
      policyDecisionIdGenerator: () =>
        `pol_${String(++decisionCounter).padStart(8, "0")}`,
      spanIdGenerator: () => `${String(++spanCounter).padStart(16, "0")}`,
      traceIdGenerator: () =>
        `${String(++traceCounter).padStart(32, "0")}`,
    });

    const gitDriver: GitWorktreeDriver = {
      async add(input) {
        mkdirSync(input.worktreePath, { recursive: true });
      },
      async remove() {},
      async deleteBranch() {},
    };
    const runtimeDriver: ContainerRuntimeDriver = {
      async start() {
        return {
          containerId: "ctr_runtime",
          hostPort: 45231,
        };
      },
    };

    const workspaceManager = createWorkspaceManager({
      previewDomain: "takomi.localhost",
      stateDir: path.join(root, "state"),
      workspacesDir: path.join(root, "workspaces"),
      worktreeRootDir: path.join(root, "worktrees"),
      gitDriver,
      now,
      idGenerator: () => "ws_00000001",
      eventIdGenerator: () => `evt_${String(++eventCounter).padStart(8, "0")}`,
      onEvent: (event) => {
        engine.ingestWorkspaceEvent(event);
      },
    });
    const runtimeExecutor = createRuntimeExecutor({
      workspacesDir: path.join(root, "workspaces"),
      driver: runtimeDriver,
      now,
      fetchImpl: async () =>
        new Response(null, {
          status: 200,
        }),
      onStateChange: (input) => {
        engine.captureRuntimeState(input);
      },
    });
    const authBroker = createAuthBroker({
      authBrokerHost: "auth.takomi.localhost",
      stateDir: path.join(root, "state"),
      now,
      stateSecret: "test-secret",
      idGenerator: () => "auth_00000001",
      nonceGenerator: () => "nonce-value-that-is-long-enough",
      eventIdGenerator: () => `evt_${String(++eventCounter).padStart(8, "0")}`,
      onEvent: (event) => {
        engine.ingestAuthEvent(event);
      },
    });

    const workspace = await workspaceManager.create({
      slug: "observability-suite",
      repoPath,
      baseBranch: "main",
      branchType: "agent",
      runtimeType: "container",
    });
    const run = engine.startRun({
      workspaceId: workspace.id,
      agentType: "Codex",
      budgetUsd: 5,
    });

    await runtimeExecutor.boot(
      createRuntimeConfig(workspace.id, workspace.slug, repoPath),
    );
    runtimeExecutor.attachPreview(workspace.id, {
      workspaceId: workspace.id,
      host: workspace.previewHost,
      url: `http://${workspace.previewHost}/`,
      routeStatus: "registered",
      healthStatus: "healthy",
      proxyHost: "127.0.0.1",
      proxyPort: 80,
      proxyStatus: "ready",
      target: "127.0.0.1:45231",
      manualFallbackUrl: "http://127.0.0.1:45231/",
      lastError: null,
    });
    authBroker.createBrowserSession({
      workspaceId: workspace.id,
      previewHost: workspace.previewHost,
      provider: "github",
    });
    engine.recordRunEvent(run.id, {
      category: "validation",
      type: "validation.completed",
      source: "browser-sidecar",
      summary: "Validation bundle captured.",
      detail: "Preview checks passed.",
      outcome: "success",
      trace: {
        name: "validation.completed",
        kind: "internal",
        durationMs: 910,
        statusCode: "ok",
        statusMessage: null,
      },
      attributes: {
        bundleId: "bundle_01",
      },
    });

    const eventTypes = engine
      .listEvents({ workspaceId: workspace.id })
      .map((event) => event.type);

    expect(eventTypes).toEqual(
      expect.arrayContaining([
        "workspace.created",
        "run.started",
        "preview.booting",
        "preview.running",
        "preview.route.registered",
        "auth.session.requested",
        "validation.completed",
      ]),
    );

    const authEvent = engine
      .listEvents({ workspaceId: workspace.id })
      .find((event) => event.type === "auth.session.requested");
    expect(authEvent?.runId).toBe(run.id);

    const validationSpan = engine
      .listSpans(run.id)
      .find((span) => span.name === "validation.completed");
    expect(validationSpan).toMatchObject({
      runId: run.id,
      durationMs: 910,
      category: "validation",
    });
  });

  it("warns before pausing on budget exceed", () => {
    const root = createTempDir();
    const now = createClock();
    const engine = createObservabilityPolicyEngine({
      runsDir: path.join(root, "runs"),
      stateDir: path.join(root, "state"),
      now,
      runIdGenerator: () => "run_00000001",
      traceIdGenerator: () => "0123456789abcdef0123456789abcdef",
      spanIdGenerator: () => "0123456789abcdef",
    });

    const run = engine.startRun({
      workspaceId: "ws_00000001",
      agentType: "Codex",
      budgetUsd: 1,
      warningBudgetUsd: 0.8,
    });

    engine.recordRunEvent(run.id, {
      category: "tool",
      type: "tool.completed",
      source: "agent-runtime",
      summary: "Ran unit tests.",
      detail: null,
      outcome: "success",
      usage: {
        model: "gpt-test",
        inputTokens: 500,
        outputTokens: 500,
        inputCostUsd: 0.45,
        outputCostUsd: 0.4,
      },
      attributes: {
        command: "pnpm test",
        exitCode: 0,
      },
    });

    const warnedRun = engine.getRun(run.id);
    expect(warnedRun?.warningCount).toBe(1);
    expect(
      engine.listEvents({ runId: run.id }).some((event) => event.type === "policy.warning"),
    ).toBe(true);

    engine.recordRunEvent(run.id, {
      category: "tool",
      type: "tool.completed",
      source: "agent-runtime",
      summary: "Ran integration tests.",
      detail: null,
      outcome: "success",
      usage: {
        model: "gpt-test",
        inputTokens: 100,
        outputTokens: 100,
        inputCostUsd: 0.1,
        outputCostUsd: 0.05,
      },
      attributes: {
        command: "pnpm test:integration",
        exitCode: 0,
      },
    });

    const pausedRun = engine.getRun(run.id);
    expect(pausedRun).toMatchObject({
      status: "paused",
      stopReason: "budget_exceeded",
    });
    expect(
      engine.listEvents({ runId: run.id }).some((event) => event.type === "policy.pause"),
    ).toBe(true);
  });

  it("pauses repeated failure loops deterministically", () => {
    const root = createTempDir();
    const now = createClock();
    const engine = createObservabilityPolicyEngine({
      runsDir: path.join(root, "runs"),
      stateDir: path.join(root, "state"),
      now,
      runIdGenerator: () => "run_00000002",
      traceIdGenerator: () => "fedcba9876543210fedcba9876543210",
      spanIdGenerator: () => "fedcba9876543210",
    });

    const run = engine.startRun({
      workspaceId: "ws_00000002",
      agentType: "Codex",
      budgetUsd: 10,
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      engine.recordRunEvent(run.id, {
        category: "tool",
        type: "tool.completed",
        source: "agent-runtime",
        summary: "pnpm test failed.",
        detail: "1 suite failed.",
        outcome: "error",
        attributes: {
          command: "pnpm test",
          exitCode: 1,
        },
      });
    }

    expect(engine.getRun(run.id)).toMatchObject({
      status: "paused",
      stopReason: "loop_detected",
    });
  });

  it("pauses when a command falls into an approval-required category", () => {
    const root = createTempDir();
    const now = createClock();
    const engine = createObservabilityPolicyEngine({
      runsDir: path.join(root, "runs"),
      stateDir: path.join(root, "state"),
      now,
      runIdGenerator: () => "run_00000003",
      traceIdGenerator: () => "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      spanIdGenerator: () => "bbbbbbbbbbbbbbbb",
    });

    const run = engine.startRun({
      workspaceId: "ws_00000003",
      agentType: "Codex",
      budgetUsd: 10,
    });

    engine.recordRunEvent(run.id, {
      category: "tool",
      type: "tool.started",
      source: "agent-runtime",
      summary: "Resetting the database.",
      detail: null,
      outcome: "running",
      attributes: {
        command: "pnpm prisma migrate reset --force",
      },
    });

    expect(engine.getRun(run.id)).toMatchObject({
      status: "awaiting_human",
      stopReason: "approval_required",
      approvalRequired: true,
    });
  });

  it("blocks completion when validation has not passed", () => {
    const root = createTempDir();
    const now = createClock();
    const engine = createObservabilityPolicyEngine({
      runsDir: path.join(root, "runs"),
      stateDir: path.join(root, "state"),
      now,
      runIdGenerator: () => "run_00000004",
      traceIdGenerator: () => "cccccccccccccccccccccccccccccccc",
      spanIdGenerator: () => "dddddddddddddddd",
      completionGuard: () => ({
        allowed: false,
        reason: "Validation has not run yet.",
      }),
    });

    const run = engine.startRun({
      workspaceId: "ws_00000004",
      agentType: "Codex",
      budgetUsd: 10,
    });
    const completed = engine.completeRun(run.id, "Run completed.");

    expect(completed).toMatchObject({
      status: "failed",
      stopReason: "validation_failed",
      pauseReason: "Validation has not run yet.",
    });
    expect(
      engine
        .listEvents({ runId: run.id })
        .some((event) => event.type === "validation.completion_blocked"),
    ).toBe(true);
  });
});
