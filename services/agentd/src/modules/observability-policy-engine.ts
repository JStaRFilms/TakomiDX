import {
  agentEventSchema,
  agentRunSummarySchema,
  agentTraceSpanSchema,
  createAgentRunInputSchema,
  modelUsageSchema,
  policyDecisionSchema,
  policyRuleSchema,
  recordAgentEventInputSchema,
  type AgentEvent,
  type AgentRunSummary,
  type AgentTraceSpan,
  type AuthLifecycleEvent,
  type CreateAgentRunInput,
  type PolicyCategory,
  type PolicyDecision,
  type PolicyRule,
  type RecordAgentEventInput,
  type WorkspaceLifecycleEvent,
  type WorkspaceRuntimeConfig,
  type WorkspaceRuntimeState,
} from "@takomi/contracts";
import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const TERMINAL_RUN_STATUSES = new Set([
  "failed",
  "completed",
  "cancelled",
]);

const defaultPolicyRules: PolicyRule[] = [
  {
    id: "budget-warning",
    category: "budget",
    title: "Budget warning",
    description: "Warn when a run crosses its configured warning budget.",
    action: "warn",
    thresholds: {
      percentOfBudgetCap: 80,
    },
  },
  {
    id: "budget-cap",
    category: "budget",
    title: "Budget cap",
    description: "Pause a run when spend reaches the configured cap.",
    action: "pause",
    thresholds: {
      percentOfBudgetCap: 100,
    },
  },
  {
    id: "loop-detection",
    category: "loop_detection",
    title: "Repeated failure loop",
    description: "Pause a run after three identical failing tool executions.",
    action: "pause",
    thresholds: {
      repeatedFailures: 3,
    },
  },
  {
    id: "approval-filesystem-destructive",
    category: "approval",
    title: "Filesystem destructive command",
    description: "Require approval before destructive filesystem commands run.",
    action: "pause",
    thresholds: {
      commandPattern: "rm -rf",
      approvalCategory: "filesystem.destructive",
    },
  },
  {
    id: "approval-database-reset",
    category: "approval",
    title: "Database reset command",
    description: "Require approval before resets or destructive migrations.",
    action: "pause",
    thresholds: {
      commandPattern: "database reset",
      approvalCategory: "database.reset",
    },
  },
  {
    id: "approval-credential-change",
    category: "approval",
    title: "Credential mutation command",
    description: "Require approval before changing credentials or secrets.",
    action: "pause",
    thresholds: {
      commandPattern: "credential mutation",
      approvalCategory: "credentials.write",
    },
  },
].map((rule) => policyRuleSchema.parse(rule));

export interface CreateObservabilityPolicyEngineOptions {
  runsDir: string;
  stateDir: string;
  now?: () => Date;
  eventIdGenerator?: () => string;
  runIdGenerator?: () => string;
  policyDecisionIdGenerator?: () => string;
  spanIdGenerator?: () => string;
  traceIdGenerator?: () => string;
  rules?: PolicyRule[];
  completionGuard?: (run: AgentRunSummary) => {
    allowed: boolean;
    reason: string | null;
  };
}

interface RuntimeStateChangeInput {
  current: WorkspaceRuntimeState;
  previous: WorkspaceRuntimeState | null;
  config: WorkspaceRuntimeConfig | null;
}

interface BuiltEventInput extends RecordAgentEventInput {
  workspaceId: string;
  runId?: string | null;
  decision?: PolicyDecision | null;
}

function writeJsonFile(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function appendJsonLine(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, JSON.stringify(value) + "\n", "utf8");
}

function readJsonLines<T>(filePath: string): T[] {
  if (!existsSync(filePath)) {
    return [];
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function createIdentifier(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

function createHexId(byteLength: number) {
  return randomBytes(byteLength).toString("hex");
}

function roundUsd(value: number) {
  return Number(value.toFixed(6));
}

function deriveRunStopReason(category: PolicyCategory) {
  switch (category) {
    case "budget":
      return "budget_exceeded";
    case "loop_detection":
      return "loop_detected";
    case "approval":
      return "approval_required";
  }
}

function normalizeToolSignature(event: AgentEvent) {
  const command = event.attributes.command;
  const name = event.attributes.name;
  const raw =
    typeof command === "string" && command.trim().length > 0
      ? command
      : typeof name === "string" && name.trim().length > 0
        ? name
        : event.summary;

  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

function isFailingToolEvent(event: AgentEvent) {
  const exitCode = event.attributes.exitCode;

  return (
    event.category === "tool" &&
    (event.outcome === "error" ||
      (typeof exitCode === "number" && Number.isFinite(exitCode) && exitCode > 0))
  );
}

function extractApprovalCategory(event: AgentEvent) {
  const explicit = event.attributes.approvalCategory;

  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit;
  }

  const command = String(event.attributes.command ?? event.attributes.name ?? "").toLowerCase();

  if (/(^|\s)rm\s+-rf(\s|$)/.test(command)) {
    return "filesystem.destructive";
  }

  if (
    /dropdb|db reset|database reset|migrate reset|schema push --force|prisma migrate reset/.test(
      command,
    )
  ) {
    return "database.reset";
  }

  if (/credential|secret|token|api key|apikey|password/.test(command)) {
    return "credentials.write";
  }

  return null;
}

function normalizeUsage(input: RecordAgentEventInput["usage"]) {
  if (!input) {
    return null;
  }

  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const inputRateUsdPer1k = input.inputRateUsdPer1k ?? null;
  const outputRateUsdPer1k = input.outputRateUsdPer1k ?? null;

  const inputCostUsd =
    input.inputCostUsd ??
    (inputRateUsdPer1k === null
      ? null
      : roundUsd((inputTokens / 1000) * inputRateUsdPer1k));
  const outputCostUsd =
    input.outputCostUsd ??
    (outputRateUsdPer1k === null
      ? null
      : roundUsd((outputTokens / 1000) * outputRateUsdPer1k));

  return modelUsageSchema.parse({
    model: input.model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputRateUsdPer1k,
    outputRateUsdPer1k,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: roundUsd((inputCostUsd ?? 0) + (outputCostUsd ?? 0)),
  });
}

export function createObservabilityPolicyEngine(
  options: CreateObservabilityPolicyEngineOptions,
) {
  const now = options.now ?? (() => new Date());
  const eventIdGenerator =
    options.eventIdGenerator ?? (() => createIdentifier("evt"));
  const runIdGenerator =
    options.runIdGenerator ?? (() => createIdentifier("run"));
  const policyDecisionIdGenerator =
    options.policyDecisionIdGenerator ?? (() => createIdentifier("pol"));
  const spanIdGenerator = options.spanIdGenerator ?? (() => createHexId(8));
  const traceIdGenerator = options.traceIdGenerator ?? (() => createHexId(16));
  const completionGuard = options.completionGuard;
  const rules = (options.rules ?? defaultPolicyRules).map((rule) =>
    policyRuleSchema.parse(rule),
  );
  const runs = new Map<string, AgentRunSummary>();
  const activeRunIds = new Map<string, string>();
  const events = readJsonLines<AgentEvent>(
    path.join(options.stateDir, "agent-events.jsonl"),
  ).map((event) => agentEventSchema.parse(event));
  const spans = readJsonLines<AgentTraceSpan>(
    path.join(options.stateDir, "trace-spans.jsonl"),
  ).map((span) => agentTraceSpanSchema.parse(span));

  function getEventsPath() {
    return path.join(options.stateDir, "agent-events.jsonl");
  }

  function getSpansPath() {
    return path.join(options.stateDir, "trace-spans.jsonl");
  }

  function getRunDir(runId: string) {
    return path.join(options.runsDir, runId);
  }

  function getRunPath(runId: string) {
    return path.join(getRunDir(runId), "run.json");
  }

  function persistRun(run: AgentRunSummary) {
    writeJsonFile(getRunPath(run.id), run);
    runs.set(run.id, run);

    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      const activeRunId = activeRunIds.get(run.workspaceId);

      if (activeRunId === run.id) {
        activeRunIds.delete(run.workspaceId);
      }
    } else {
      activeRunIds.set(run.workspaceId, run.id);
    }
  }

  function persistEvent(event: AgentEvent) {
    appendJsonLine(getEventsPath(), event);
    events.push(event);
  }

  function persistSpan(span: AgentTraceSpan) {
    appendJsonLine(getSpansPath(), span);
    spans.push(span);
  }

  function restoreRuns() {
    mkdirSync(options.runsDir, { recursive: true });

    for (const entry of readdirSync(options.runsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const runPath = getRunPath(entry.name);

      if (!existsSync(runPath)) {
        continue;
      }

      const restored = agentRunSummarySchema.parse(
        JSON.parse(readFileSync(runPath, "utf8")),
      );

      runs.set(restored.id, restored);

      if (!TERMINAL_RUN_STATUSES.has(restored.status)) {
        const currentActive = activeRunIds.get(restored.workspaceId);

        if (!currentActive) {
          activeRunIds.set(restored.workspaceId, restored.id);
          continue;
        }

        const currentRun = runs.get(currentActive);

        if (!currentRun || currentRun.updatedAt.localeCompare(restored.updatedAt) < 0) {
          activeRunIds.set(restored.workspaceId, restored.id);
        }
      }
    }
  }

  restoreRuns();

  function getRunOrThrow(runId: string) {
    const run = runs.get(runId);

    if (!run) {
      throw new Error(`No run is registered for ${runId}.`);
    }

    return run;
  }

  function getActiveRun(workspaceId: string) {
    const runId = activeRunIds.get(workspaceId);
    return runId ? runs.get(runId) ?? null : null;
  }

  function buildEvent(input: BuiltEventInput) {
    const request = recordAgentEventInputSchema.parse(input);
    const activeRun =
      typeof input.runId === "string" ? runs.get(input.runId) ?? null : getActiveRun(input.workspaceId);
    const run =
      activeRun && activeRun.workspaceId === input.workspaceId ? activeRun : null;
    const timestamp = request.timestamp ?? now().toISOString();
    const spanId = run ? spanIdGenerator() : null;
    const parentSpanId = run
      ? request.parentSpanId ?? run.rootSpanId
      : null;

    return {
      event: agentEventSchema.parse({
        id: eventIdGenerator(),
        workspaceId: input.workspaceId,
        runId: run?.id ?? null,
        category: request.category,
        type: request.type,
        source: request.source,
        timestamp,
        summary: request.summary,
        detail: request.detail,
        outcome: request.outcome,
        traceId: run?.traceId ?? null,
        spanId,
        parentSpanId,
        usage: normalizeUsage(request.usage),
        decision: input.decision ?? null,
        attributes: request.attributes,
      }),
      run,
      trace: request.trace,
    };
  }

  function maybePersistSpan(
    event: AgentEvent,
    run: AgentRunSummary | null,
    trace: RecordAgentEventInput["trace"],
  ) {
    if (!run || !event.traceId || !event.spanId) {
      return null;
    }

    const durationMs = trace?.durationMs ?? 0;
    const endedAt = event.timestamp;
    const startedAt = new Date(
      new Date(endedAt).getTime() - durationMs,
    ).toISOString();
    const statusCode =
      trace?.statusCode ??
      (event.outcome === "error"
        ? "error"
        : event.outcome === "success" || event.outcome === "warn" || event.outcome === "paused"
          ? "ok"
          : "unset");

    const span = agentTraceSpanSchema.parse({
      traceId: event.traceId,
      spanId: event.spanId,
      parentSpanId: event.parentSpanId,
      runId: run.id,
      workspaceId: run.workspaceId,
      name: trace?.name ?? event.summary,
      kind: trace?.kind ?? "internal",
      category: event.category,
      source: event.source,
      startedAt,
      endedAt,
      durationMs,
      statusCode,
      statusMessage: trace?.statusMessage ?? event.detail,
      outcome: event.outcome,
      attributes: event.attributes,
      summary: event.summary,
    });

    persistSpan(span);
    return span;
  }

  function applyEventToRun(run: AgentRunSummary, event: AgentEvent) {
    let nextRun = agentRunSummarySchema.parse({
      ...run,
      updatedAt: event.timestamp,
      lastAction: event.summary,
      lastEventId: event.id,
      totalTokens:
        run.totalTokens + (event.usage?.totalTokens ?? 0),
      tokenCostUsd: roundUsd(run.tokenCostUsd + (event.usage?.totalCostUsd ?? 0)),
      lastTool:
        event.category === "tool"
          ? String(event.attributes.command ?? event.attributes.name ?? event.summary)
          : run.lastTool,
    });

    if (event.category === "preview" && event.outcome === "error") {
      nextRun = agentRunSummarySchema.parse({
        ...nextRun,
        status: "failed",
        stopReason: "runtime_failed",
        pauseReason: event.summary,
      });
    }

    if (event.category === "validation" && event.outcome === "error") {
      nextRun = agentRunSummarySchema.parse({
        ...nextRun,
        status: "failed",
        stopReason: "validation_failed",
        pauseReason: event.summary,
      });
    }

    if (event.category === "run" && event.type === "run.completed") {
      nextRun = agentRunSummarySchema.parse({
        ...nextRun,
        status: "completed",
        completedAt: event.timestamp,
        stopReason: "completed",
        pauseReason: null,
        approvalRequired: false,
      });
    }

    if (event.category === "run" && event.type === "run.cancelled") {
      nextRun = agentRunSummarySchema.parse({
        ...nextRun,
        status: "cancelled",
        completedAt: event.timestamp,
        stopReason: "cancelled",
        pauseReason: event.summary,
        approvalRequired: false,
      });
    }

    persistRun(nextRun);
    return nextRun;
  }

  function buildPolicyDecision(
    run: AgentRunSummary,
    input: {
      category: PolicyCategory;
      ruleId: string;
      action: "warn" | "pause";
      reason: string;
      summary: string;
      eventId: string;
    },
  ) {
    return policyDecisionSchema.parse({
      id: policyDecisionIdGenerator(),
      workspaceId: run.workspaceId,
      runId: run.id,
      ruleId: input.ruleId,
      category: input.category,
      action: input.action,
      reason: input.reason,
      summary: input.summary,
      createdAt: now().toISOString(),
      eventId: input.eventId,
    });
  }

  function applyDecisionToRun(run: AgentRunSummary, decision: PolicyDecision) {
    let nextRun = agentRunSummarySchema.parse({
      ...run,
      updatedAt: decision.createdAt,
      warningCount: decision.action === "warn" ? run.warningCount + 1 : run.warningCount,
      policyState: decision,
      lastAction: decision.summary,
      pauseReason:
        decision.action === "pause" ? decision.reason : run.pauseReason,
    });

    if (decision.action === "warn") {
      persistRun(nextRun);
      return nextRun;
    }

    nextRun = agentRunSummarySchema.parse({
      ...nextRun,
      status: decision.category === "approval" ? "awaiting_human" : "paused",
      stopReason: deriveRunStopReason(decision.category),
      approvalRequired: decision.category === "approval",
    });

    persistRun(nextRun);
    return nextRun;
  }

  function hasDecision(runId: string, ruleId: string) {
    return events.some(
      (event) => event.runId === runId && event.decision?.ruleId === ruleId,
    );
  }

  function evaluatePolicies(run: AgentRunSummary, event: AgentEvent) {
    const decisions: PolicyDecision[] = [];
    const approvalCategory = extractApprovalCategory(event);

    if (
      event.category === "tool" &&
      approvalCategory &&
      !run.approvalRequired &&
      !hasDecision(run.id, `approval-${approvalCategory}`)
    ) {
      decisions.push(
        buildPolicyDecision(run, {
          category: "approval",
          ruleId: `approval-${approvalCategory}`,
          action: "pause",
          reason: `Approval is required before continuing with ${approvalCategory}.`,
          summary: `Policy paused the run for ${approvalCategory}.`,
          eventId: event.id,
        }),
      );
    }

    if (
      run.budget.warningUsd > 0 &&
      run.tokenCostUsd >= run.budget.warningUsd &&
      run.tokenCostUsd < run.budget.capUsd &&
      !hasDecision(run.id, "budget-warning")
    ) {
      decisions.push(
        buildPolicyDecision(run, {
          category: "budget",
          ruleId: "budget-warning",
          action: "warn",
          reason: `Run spend reached $${run.tokenCostUsd.toFixed(2)} against a $${run.budget.capUsd.toFixed(2)} cap.`,
          summary: "Budget warning emitted for the active run.",
          eventId: event.id,
        }),
      );
    }

    if (
      run.budget.capUsd > 0 &&
      run.tokenCostUsd >= run.budget.capUsd &&
      !hasDecision(run.id, "budget-cap")
    ) {
      decisions.push(
        buildPolicyDecision(run, {
          category: "budget",
          ruleId: "budget-cap",
          action: "pause",
          reason: `Run spend reached $${run.tokenCostUsd.toFixed(2)} and exceeded the configured cap of $${run.budget.capUsd.toFixed(2)}.`,
          summary: "Budget cap exceeded; run paused.",
          eventId: event.id,
        }),
      );
    }

    if (isFailingToolEvent(event) && !hasDecision(run.id, "loop-detection")) {
      const failures = events
        .filter((item) => item.runId === run.id)
        .filter(isFailingToolEvent)
        .slice(-3);

      if (
        failures.length === 3 &&
        failures.every(
          (item) => normalizeToolSignature(item) === normalizeToolSignature(event),
        )
      ) {
        decisions.push(
          buildPolicyDecision(run, {
            category: "loop_detection",
            ruleId: "loop-detection",
            action: "pause",
            reason: `The tool ${normalizeToolSignature(event)} failed three times in a row.`,
            summary: "Repeated failure loop detected; run paused.",
            eventId: event.id,
          }),
        );
      }
    }

    return decisions;
  }

  function emitEvent(input: BuiltEventInput) {
    const built = buildEvent(input);
    persistEvent(built.event);
    maybePersistSpan(built.event, built.run, built.trace);
    return built;
  }

  function emitPolicyDecision(run: AgentRunSummary, decision: PolicyDecision) {
    const built = emitEvent({
      workspaceId: run.workspaceId,
      runId: run.id,
      category: "policy",
      type:
        decision.action === "warn" ? "policy.warning" : "policy.pause",
      source: "policy-engine",
      summary: decision.summary,
      detail: decision.reason,
      outcome: decision.action === "warn" ? "warn" : "paused",
      decision,
      trace: {
        name: decision.summary,
        kind: "internal",
        durationMs: 0,
        statusCode: "ok",
        statusMessage: decision.reason,
      },
      attributes: {
        ruleId: decision.ruleId,
        category: decision.category,
        action: decision.action,
      },
    });

    return applyDecisionToRun(run, decision) && built.event;
  }

  return {
    startRun(input: CreateAgentRunInput) {
      const request = createAgentRunInputSchema.parse(input);
      const timestamp = now().toISOString();
      const run = agentRunSummarySchema.parse({
        id: runIdGenerator(),
        workspaceId: request.workspaceId,
        agentType: request.agentType,
        status: "running",
        traceId: traceIdGenerator(),
        rootSpanId: spanIdGenerator(),
        startedAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
        lastAction: `Run started for ${request.agentType}.`,
        lastTool: null,
        totalTokens: 0,
        tokenCostUsd: 0,
        stopReason: null,
        pauseReason: null,
        approvalRequired: false,
        budget: {
          capUsd: request.budgetUsd,
          warningUsd: request.warningBudgetUsd ?? roundUsd(request.budgetUsd * 0.8),
        },
        lastEventId: null,
        warningCount: 0,
        policyState: null,
      });

      persistRun(run);

      const event = agentEventSchema.parse({
        id: eventIdGenerator(),
        workspaceId: run.workspaceId,
        runId: run.id,
        category: "run",
        type: "run.started",
        source: "observability-policy-engine",
        timestamp,
        summary: run.lastAction,
        detail: null,
        outcome: "success",
        traceId: run.traceId,
        spanId: run.rootSpanId,
        parentSpanId: null,
        usage: null,
        decision: null,
        attributes: {
          agentType: run.agentType,
          budgetCapUsd: run.budget.capUsd,
          warningBudgetUsd: run.budget.warningUsd,
        },
      });

      persistEvent(event);
      persistSpan(
        agentTraceSpanSchema.parse({
          traceId: run.traceId,
          spanId: run.rootSpanId,
          parentSpanId: null,
          runId: run.id,
          workspaceId: run.workspaceId,
          name: "run.root",
          kind: "internal",
          category: "run",
          source: "observability-policy-engine",
          startedAt: timestamp,
          endedAt: timestamp,
          durationMs: 0,
          statusCode: "ok",
          statusMessage: null,
          outcome: "success",
          attributes: {
            agentType: run.agentType,
          },
          summary: run.lastAction,
        }),
      );

      return applyEventToRun(run, event);
    },

    completeRun(runId: string, summary: string = "Run completed.") {
      const run = getRunOrThrow(runId);
      const guard = completionGuard?.(run) ?? {
        allowed: true,
        reason: null,
      };

      if (!guard.allowed) {
        const blocked = emitEvent({
          workspaceId: run.workspaceId,
          runId,
          category: "validation",
          type: "validation.completion_blocked",
          source: "observability-policy-engine",
          summary: guard.reason ?? "Validation must pass before completion.",
          detail: summary,
          outcome: "error",
          trace: {
            name: "validation.completion_blocked",
            kind: "internal",
            durationMs: 0,
            statusCode: "error",
            statusMessage: guard.reason,
          },
          attributes: {},
        });

        return applyEventToRun(run, blocked.event);
      }

      const built = emitEvent({
        workspaceId: run.workspaceId,
        runId,
        category: "run",
        type: "run.completed",
        source: "observability-policy-engine",
        summary,
        detail: null,
        outcome: "success",
        trace: {
          name: "run.complete",
          kind: "internal",
          durationMs: 0,
          statusCode: "ok",
          statusMessage: null,
        },
        attributes: {},
      });

      return applyEventToRun(run, built.event);
    },

    recordRunEvent(runId: string, input: RecordAgentEventInput) {
      const currentRun = getRunOrThrow(runId);
      const built = emitEvent({
        ...input,
        workspaceId: currentRun.workspaceId,
        runId,
      });
      let nextRun = applyEventToRun(currentRun, built.event);

      if (
        built.event.category !== "policy" &&
        !TERMINAL_RUN_STATUSES.has(nextRun.status)
      ) {
        for (const decision of evaluatePolicies(nextRun, built.event)) {
          emitPolicyDecision(nextRun, decision);
          nextRun = runs.get(nextRun.id) ?? nextRun;
        }
      }

      return {
        event: built.event,
        run: nextRun,
      };
    },

    ingestWorkspaceEvent(event: WorkspaceLifecycleEvent) {
      return emitEvent({
        workspaceId: event.workspaceId,
        category: "workspace",
        type: event.type,
        source: "workspace-manager",
        summary: event.summary,
        detail: event.detail,
        outcome: event.type === "workspace.restore_failed" ? "error" : "success",
        trace: {
          name: event.type,
          kind: "internal",
          durationMs: 0,
          statusCode: event.type === "workspace.restore_failed" ? "error" : "ok",
          statusMessage: event.detail,
        },
        attributes: {
          status: event.status,
          workspaceSlug: event.workspaceSlug,
        },
      }).event;
    },

    ingestAuthEvent(event: AuthLifecycleEvent) {
      return emitEvent({
        workspaceId: event.workspaceId,
        category: "auth",
        type: event.type,
        source: "auth-broker",
        summary: event.summary,
        detail: event.detail ?? event.error?.message ?? null,
        outcome: event.type === "auth.session.failed" ? "error" : "info",
        trace: {
          name: event.type,
          kind: "internal",
          durationMs: 0,
          statusCode: event.type === "auth.session.failed" ? "error" : "unset",
          statusMessage: event.error?.message ?? event.detail,
        },
        attributes: {
          sessionId: event.sessionId,
          provider: event.provider,
          flow: event.flow,
          status: event.status,
          errorCode: event.error?.code ?? null,
        },
      }).event;
    },

    captureRuntimeState(input: RuntimeStateChangeInput) {
      const items: AgentEvent[] = [];

      if (!input.previous || input.previous.lifecycle !== input.current.lifecycle) {
        let type = "preview.running";
        let outcome: "running" | "success" | "error" = "success";
        let summary = `Runtime is ${input.current.lifecycle} for ${input.current.workspaceSlug}.`;

        if (input.current.lifecycle === "booting") {
          type = "preview.booting";
          outcome = "running";
          summary = `Runtime is booting for ${input.current.workspaceSlug}.`;
        }

        if (input.current.lifecycle === "failed") {
          type = "preview.failed";
          outcome = "error";
          summary = `Runtime failed for ${input.current.workspaceSlug}.`;
        }

        items.push(
          emitEvent({
            workspaceId: input.current.workspaceId,
            category: "preview",
            type,
            source: "runtime-executor",
            summary,
            detail: input.current.lastError,
            outcome,
            trace: {
              name: type,
              kind: "internal",
              durationMs: 0,
              statusCode: outcome === "error" ? "error" : outcome === "success" ? "ok" : "unset",
              statusMessage: input.current.lastError,
            },
            attributes: {
              lifecycle: input.current.lifecycle,
              healthStatus: input.current.healthStatus,
              assignedHostPort: input.current.assignedHostPort,
            },
          }).event,
        );
      }

      if (input.current.preview && !input.previous?.preview) {
        items.push(
          emitEvent({
            workspaceId: input.current.workspaceId,
            category: "preview",
            type: "preview.route.registered",
            source: "runtime-executor",
            summary: `Preview route registered for ${input.current.workspaceSlug}.`,
            detail: input.current.preview.url,
            outcome:
              input.current.preview.healthStatus === "healthy" ? "success" : "warn",
            trace: {
              name: "preview.route.registered",
              kind: "internal",
              durationMs: 0,
              statusCode:
                input.current.preview.healthStatus === "failed" ? "error" : "ok",
              statusMessage: input.current.preview.lastError,
            },
            attributes: {
              host: input.current.preview.host,
              routeStatus: input.current.preview.routeStatus,
              healthStatus: input.current.preview.healthStatus,
              manualFallbackUrl: input.current.preview.manualFallbackUrl,
            },
          }).event,
        );
      } else if (
        input.current.preview &&
        input.previous?.preview &&
        (input.current.preview.healthStatus !== input.previous.preview.healthStatus ||
          input.current.preview.routeStatus !== input.previous.preview.routeStatus ||
          input.current.preview.lastError !== input.previous.preview.lastError)
      ) {
        items.push(
          emitEvent({
            workspaceId: input.current.workspaceId,
            category: "preview",
            type: "preview.health.updated",
            source: "runtime-executor",
            summary: `Preview health updated for ${input.current.workspaceSlug}.`,
            detail: input.current.preview.lastError,
            outcome:
              input.current.preview.healthStatus === "healthy"
                ? "success"
                : input.current.preview.healthStatus === "failed"
                  ? "error"
                  : "warn",
            trace: {
              name: "preview.health.updated",
              kind: "internal",
              durationMs: 0,
              statusCode:
                input.current.preview.healthStatus === "failed" ? "error" : "ok",
              statusMessage: input.current.preview.lastError,
            },
            attributes: {
              host: input.current.preview.host,
              routeStatus: input.current.preview.routeStatus,
              healthStatus: input.current.preview.healthStatus,
            },
          }).event,
        );
      }

      return items;
    },

    getRun(runId: string) {
      return runs.get(runId) ?? null;
    },

    getActiveRun(workspaceId: string) {
      return getActiveRun(workspaceId);
    },

    listRuns(workspaceId?: string) {
      const filtered = workspaceId
        ? Array.from(runs.values()).filter((run) => run.workspaceId === workspaceId)
        : Array.from(runs.values());

      return filtered.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    listEvents(filters?: { workspaceId?: string; runId?: string }) {
      return events
        .filter((event) =>
          filters?.workspaceId ? event.workspaceId === filters.workspaceId : true,
        )
        .filter((event) => (filters?.runId ? event.runId === filters.runId : true))
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
    },

    listSpans(runId?: string) {
      const filtered = runId
        ? spans.filter((span) => span.runId === runId)
        : spans;

      return [...filtered].sort((left, right) =>
        right.endedAt.localeCompare(left.endedAt),
      );
    },

    listPolicyRules() {
      return [...rules];
    },
  };
}

export type ObservabilityPolicyEngine = ReturnType<
  typeof createObservabilityPolicyEngine
>;

export function createObservabilityPolicyBoundary(
  runCount: number = 0,
  eventCount: number = 0,
) {
  return {
    name: "observability-policy-engine",
    note: "Owns run events, traces, spend summaries, and deterministic policy pauses.",
    status: "ready",
    activeRuns: runCount,
    eventCount,
  } as const;
}
