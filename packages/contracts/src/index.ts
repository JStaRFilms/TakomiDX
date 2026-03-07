import { z } from "zod";

export const workspaceIdSchema = z.string().regex(/^ws_[a-z0-9]{8,}$/);
export const runIdSchema = z.string().regex(/^run_[a-z0-9]{8,}$/);
export const authSessionIdSchema = z.string().regex(/^auth_[a-z0-9]{8,}$/);
export const workspaceSlugSchema = z
  .string()
  .min(3)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const previewDomainSchema = z
  .string()
  .min(3)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

export const runtimeTypeSchema = z.enum(["container"]);
export const editorTargetSchema = z.enum(["vscode"]);
export const workspaceBranchTypeSchema = z.enum(["agent", "review"]);
export const workspaceStatusSchema = z.enum([
  "queued",
  "booting",
  "running",
  "awaiting_human",
  "validating",
  "failed",
  "completed",
  "archived",
]);
export const healthStatusSchema = z.enum(["healthy", "degraded", "failed"]);
export const runtimeLifecycleStateSchema = z.enum([
  "booting",
  "running",
  "stopping",
  "stopped",
  "failed",
]);
export const previewProtocolSchema = z.enum(["http", "https"]);
export const previewRouteStatusSchema = z.enum([
  "pending",
  "registered",
  "degraded",
  "failed",
  "removed",
]);
export const routeTargetSchema = z.string().regex(/^[a-z0-9.-]+:\d{1,5}$/i);
export const authProviderSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
export const authFlowTypeSchema = z.enum(["browser_callback", "device_code"]);
export const authSessionStatusSchema = z.enum([
  "requested",
  "awaiting_user",
  "callback_received",
  "failed",
  "completed",
]);
export const authDeviceFlowStatusSchema = z.enum([
  "pending",
  "awaiting_user",
  "authorized",
  "denied",
  "expired",
]);
export const authErrorCodeSchema = z.enum([
  "invalid_state",
  "expired_state",
  "provider_error",
  "session_not_found",
  "workspace_not_found",
  "workspace_mismatch",
  "invalid_handoff",
  "device_flow_denied",
  "device_flow_expired",
]);

export const authErrorSchema = z.object({
  code: authErrorCodeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  providerMessage: z.string().min(1).nullable().default(null),
  expectedCallbackUrl: z.string().url().nullable().default(null),
  receivedCallbackUrl: z.string().url().nullable().default(null),
  resolution: z.string().min(1).nullable().default(null),
});

export const authStatePayloadSchema = z.object({
  sessionId: authSessionIdSchema,
  workspaceId: workspaceIdSchema,
  provider: authProviderSchema,
  nonce: z.string().min(16),
  expiresAt: z.string().datetime({ offset: true }),
});

export const authHandoffPayloadSchema = z.object({
  sessionId: authSessionIdSchema,
  workspaceId: workspaceIdSchema,
  provider: authProviderSchema,
  nonce: z.string().min(16),
  expiresAt: z.string().datetime({ offset: true }),
});

export const authCallbackPayloadSchema = z.object({
  code: z.string().min(1).nullable().default(null),
  error: z.string().min(1).nullable().default(null),
  errorDescription: z.string().min(1).nullable().default(null),
  errorUri: z.string().url().nullable().default(null),
  receivedAt: z.string().datetime({ offset: true }),
});

export const authDeviceFlowSchema = z.object({
  status: authDeviceFlowStatusSchema,
  userCode: z.string().min(1),
  verificationUri: z.string().url(),
  verificationUriComplete: z.string().url().nullable().default(null),
  intervalSeconds: z.number().int().min(1).nullable().default(null),
});

export const sharedRuntimeEnvSchema = z.object({
  TAKOMI_APP_NAME: z.string().default("TakomiDX"),
  TAKOMI_DATA_DIR: z.string().min(1).default(".takomi"),
  TAKOMI_PREVIEW_DOMAIN: previewDomainSchema.default("takomi.localhost"),
  TAKOMI_RUNTIME_BACKEND: runtimeTypeSchema.default("container"),
  TAKOMI_EDITOR_TARGET: editorTargetSchema.default("vscode"),
});

export const missionControlPublicEnvSchema = z.object({
  NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:4000"),
  NEXT_PUBLIC_TAKOMI_PREVIEW_DOMAIN: previewDomainSchema.default(
    "takomi.localhost",
  ),
});

export const agentdEnvSchema = z.object({
  TAKOMI_AGENTD_HOST: z.string().min(1).default("127.0.0.1"),
  TAKOMI_AGENTD_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
});

export const workspaceArtifactLayoutSchema = z.object({
  root: z.string().min(1),
  logsDir: z.string().min(1),
  tracesDir: z.string().min(1),
  reviewDir: z.string().min(1),
  browserDir: z.string().min(1),
});

export const createWorkspaceInputSchema = z.object({
  slug: workspaceSlugSchema,
  repoPath: z.string().min(1),
  baseBranch: z.string().min(1).default("main"),
  branchType: workspaceBranchTypeSchema.default("agent"),
  runtimeType: runtimeTypeSchema.default("container"),
});

export const deleteWorkspaceInputSchema = z.object({
  confirm: z.boolean().default(false),
  deleteBranch: z.boolean().default(false),
});

export const workspaceMetadataSchema = z.object({
  metadataVersion: z.literal(1).default(1),
  id: workspaceIdSchema,
  slug: workspaceSlugSchema,
  repoPath: z.string().min(1),
  worktreePath: z.string().min(1).nullable(),
  branch: z.string().min(1),
  baseBranch: z.string().min(1),
  branchType: workspaceBranchTypeSchema,
  runtimeType: runtimeTypeSchema,
  previewHost: previewDomainSchema,
  status: workspaceStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  archivedAt: z.string().datetime({ offset: true }).nullable(),
  lastError: z.string().min(1).nullable().default(null),
  artifacts: workspaceArtifactLayoutSchema,
});

export const workspaceLifecycleEventTypeSchema = z.enum([
  "workspace.created",
  "workspace.restored",
  "workspace.restore_failed",
  "workspace.archived",
  "workspace.deleted",
]);

export const workspaceLifecycleEventSchema = z.object({
  id: z.string().min(1),
  workspaceId: workspaceIdSchema,
  workspaceSlug: workspaceSlugSchema,
  type: workspaceLifecycleEventTypeSchema,
  status: workspaceStatusSchema,
  timestamp: z.string().datetime({ offset: true }),
  summary: z.string().min(1),
  detail: z.string().min(1).nullable().default(null),
});

export const authSessionSchema = z.object({
  id: authSessionIdSchema,
  workspaceId: workspaceIdSchema,
  provider: authProviderSchema,
  flow: authFlowTypeSchema,
  status: authSessionStatusSchema,
  stateNonce: z.string().min(16),
  callbackUrl: z.string().url().nullable().default(null),
  previewUrl: z.string().url(),
  forwardPath: z.string().min(1).default("/.takomi/auth/callback"),
  requestedAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable().default(null),
  lastError: authErrorSchema.nullable().default(null),
  callback: authCallbackPayloadSchema.nullable().default(null),
  device: authDeviceFlowSchema.nullable().default(null),
  forwardUrl: z.string().url().nullable().default(null),
});

export const authSessionStartResponseSchema = z.object({
  session: authSessionSchema,
  state: z.string().min(1).nullable().default(null),
});

export const workspaceAuthSummarySchema = z.object({
  sessionId: authSessionIdSchema,
  provider: authProviderSchema,
  flow: authFlowTypeSchema,
  status: authSessionStatusSchema,
  label: z.string().min(1),
  detail: z.string().min(1).nullable().default(null),
  callbackUrl: z.string().url().nullable().default(null),
  error: authErrorSchema.nullable().default(null),
  device: authDeviceFlowSchema.nullable().default(null),
});

export const authLifecycleEventTypeSchema = z.enum([
  "auth.session.requested",
  "auth.device.requested",
  "auth.callback.received",
  "auth.session.failed",
  "auth.session.completed",
]);

export const authLifecycleEventSchema = z.object({
  id: z.string().min(1),
  sessionId: authSessionIdSchema,
  workspaceId: workspaceIdSchema,
  provider: authProviderSchema,
  flow: authFlowTypeSchema,
  type: authLifecycleEventTypeSchema,
  status: authSessionStatusSchema,
  timestamp: z.string().datetime({ offset: true }),
  summary: z.string().min(1),
  detail: z.string().min(1).nullable().default(null),
  error: authErrorSchema.nullable().default(null),
});

export const traceIdSchema = z.string().regex(/^[a-f0-9]{32}$/);
export const spanIdSchema = z.string().regex(/^[a-f0-9]{16}$/);
export const agentEventCategorySchema = z.enum([
  "workspace",
  "run",
  "tool",
  "auth",
  "preview",
  "validation",
  "policy",
]);
export const agentEventOutcomeSchema = z.enum([
  "info",
  "running",
  "success",
  "warn",
  "error",
  "paused",
]);
export const traceSpanKindSchema = z.enum([
  "internal",
  "server",
  "client",
  "producer",
  "consumer",
]);
export const traceStatusCodeSchema = z.enum(["unset", "ok", "error"]);
export const runStopReasonSchema = z.enum([
  "budget_exceeded",
  "loop_detected",
  "approval_required",
  "runtime_failed",
  "validation_failed",
  "completed",
  "cancelled",
  "unknown",
]);
export const agentRunStatusSchema = z.enum([
  "queued",
  "running",
  "awaiting_human",
  "paused",
  "failed",
  "completed",
  "cancelled",
]);
export const policyActionSchema = z.enum(["allow", "warn", "pause"]);
export const policyCategorySchema = z.enum([
  "budget",
  "loop_detection",
  "approval",
]);
export const eventAttributeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const modelUsageSchema = z.object({
  model: z.string().min(1),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  inputRateUsdPer1k: z.number().min(0).nullable().default(null),
  outputRateUsdPer1k: z.number().min(0).nullable().default(null),
  inputCostUsd: z.number().min(0).nullable().default(null),
  outputCostUsd: z.number().min(0).nullable().default(null),
  totalCostUsd: z.number().min(0),
});

export const policyRuleSchema = z.object({
  id: z.string().min(1),
  category: policyCategorySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  action: policyActionSchema,
  thresholds: z.record(eventAttributeValueSchema).default({}),
});

export const policyDecisionSchema = z.object({
  id: z.string().min(1),
  workspaceId: workspaceIdSchema,
  runId: runIdSchema,
  ruleId: z.string().min(1),
  category: policyCategorySchema,
  action: policyActionSchema,
  reason: z.string().min(1),
  summary: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  eventId: z.string().min(1).nullable().default(null),
});

export const agentTraceSpanSchema = z.object({
  traceId: traceIdSchema,
  spanId: spanIdSchema,
  parentSpanId: spanIdSchema.nullable().default(null),
  runId: runIdSchema,
  workspaceId: workspaceIdSchema,
  name: z.string().min(1),
  kind: traceSpanKindSchema.default("internal"),
  category: agentEventCategorySchema,
  source: z.string().min(1),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }),
  durationMs: z.number().int().min(0),
  statusCode: traceStatusCodeSchema.default("unset"),
  statusMessage: z.string().min(1).nullable().default(null),
  outcome: agentEventOutcomeSchema.default("info"),
  attributes: z.record(eventAttributeValueSchema).default({}),
  summary: z.string().min(1),
});

export const agentEventSchema = z.object({
  id: z.string().min(1),
  workspaceId: workspaceIdSchema,
  runId: runIdSchema.nullable().default(null),
  category: agentEventCategorySchema,
  type: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
  summary: z.string().min(1),
  detail: z.string().min(1).nullable().default(null),
  outcome: agentEventOutcomeSchema.default("info"),
  traceId: traceIdSchema.nullable().default(null),
  spanId: spanIdSchema.nullable().default(null),
  parentSpanId: spanIdSchema.nullable().default(null),
  usage: modelUsageSchema.nullable().default(null),
  decision: policyDecisionSchema.nullable().default(null),
  attributes: z.record(eventAttributeValueSchema).default({}),
});

export const agentRunBudgetSchema = z.object({
  capUsd: z.number().min(0),
  warningUsd: z.number().min(0),
});

export const agentRunSummarySchema = z.object({
  id: runIdSchema,
  workspaceId: workspaceIdSchema,
  agentType: z.string().min(1),
  status: agentRunStatusSchema,
  traceId: traceIdSchema,
  rootSpanId: spanIdSchema,
  startedAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable().default(null),
  lastAction: z.string().min(1),
  lastTool: z.string().min(1).nullable().default(null),
  totalTokens: z.number().int().min(0).default(0),
  tokenCostUsd: z.number().min(0).default(0),
  stopReason: runStopReasonSchema.nullable().default(null),
  pauseReason: z.string().min(1).nullable().default(null),
  approvalRequired: z.boolean().default(false),
  budget: agentRunBudgetSchema,
  lastEventId: z.string().min(1).nullable().default(null),
  warningCount: z.number().int().min(0).default(0),
  policyState: policyDecisionSchema.nullable().default(null),
});

export const createAgentRunInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  agentType: z.string().min(1),
  budgetUsd: z.number().min(0).default(10),
  warningBudgetUsd: z.number().min(0).nullable().default(null),
});

export const recordAgentEventInputSchema = z.object({
  category: agentEventCategorySchema,
  type: z.string().min(1),
  source: z.string().min(1).default("agentd"),
  summary: z.string().min(1),
  detail: z.string().min(1).nullable().default(null),
  outcome: agentEventOutcomeSchema.default("info"),
  timestamp: z.string().datetime({ offset: true }).nullable().default(null),
  parentSpanId: spanIdSchema.nullable().default(null),
  usage: z
    .object({
      model: z.string().min(1),
      inputTokens: z.number().int().min(0).default(0),
      outputTokens: z.number().int().min(0).default(0),
      inputRateUsdPer1k: z.number().min(0).nullable().default(null),
      outputRateUsdPer1k: z.number().min(0).nullable().default(null),
      inputCostUsd: z.number().min(0).nullable().default(null),
      outputCostUsd: z.number().min(0).nullable().default(null),
    })
    .nullable()
    .default(null),
  trace: z
    .object({
      name: z.string().min(1),
      kind: traceSpanKindSchema.default("internal"),
      durationMs: z.number().int().min(0).default(0),
      statusCode: traceStatusCodeSchema.default("unset"),
      statusMessage: z.string().min(1).nullable().default(null),
    })
    .nullable()
    .default(null),
  attributes: z.record(eventAttributeValueSchema).default({}),
});

export const workspaceSummarySchema = z.object({
  id: workspaceIdSchema,
  slug: workspaceSlugSchema,
  repoName: z.string().min(1),
  branch: z.string().min(1),
  agentType: z.string().min(1),
  status: workspaceStatusSchema,
  lastAction: z.string().min(1),
  previewHost: z.string().min(1),
  tokenCostUsd: z.number().min(0),
  elapsedMinutes: z.number().int().min(0),
  health: healthStatusSchema,
  activeRunId: runIdSchema.nullable().default(null),
  pauseReason: z.string().min(1).nullable().default(null),
  auth: workspaceAuthSummarySchema.nullable().default(null),
});

export const containerRuntimeSpecSchema = z.object({
  image: z.string().min(1),
  command: z.array(z.string().min(1)).min(1),
  workdir: z.string().min(1).default("/workspace"),
});

export const workspaceRuntimePortSchema = z.object({
  containerPort: z.number().int().min(1).max(65535),
  protocol: previewProtocolSchema.default("http"),
});

export const workspaceRuntimeConfigSchema = z.object({
  workspaceId: workspaceIdSchema,
  workspaceSlug: workspaceSlugSchema,
  repoPath: z.string().min(1),
  previewHost: previewDomainSchema,
  runtimeType: runtimeTypeSchema.default("container"),
  container: containerRuntimeSpecSchema,
  env: z.record(z.string()).default({}),
  port: workspaceRuntimePortSchema,
  healthCheckPath: z.string().min(1).default("/"),
});

export const previewRouteRecordSchema = z.object({
  workspaceId: workspaceIdSchema,
  host: previewDomainSchema,
  target: routeTargetSchema,
  targetPort: z.number().int().min(1).max(65535),
  protocol: previewProtocolSchema.default("http"),
  healthPath: z.string().min(1).default("/"),
  healthStatus: healthStatusSchema.default("degraded"),
  status: previewRouteStatusSchema.default("pending"),
  proxyAdapter: z.string().min(1).default("caddy"),
  registeredAt: z.string().datetime({ offset: true }),
  lastError: z.string().min(1).nullable().default(null),
});

export const previewRegistrationPayloadSchema = z.object({
  workspaceId: workspaceIdSchema,
  host: previewDomainSchema,
  url: z.string().url(),
  routeStatus: previewRouteStatusSchema,
  healthStatus: healthStatusSchema,
  target: routeTargetSchema,
  manualFallbackUrl: z.string().url(),
  lastError: z.string().min(1).nullable(),
});

export const workspaceRuntimeStateSchema = z.object({
  workspaceId: workspaceIdSchema,
  workspaceSlug: workspaceSlugSchema,
  repoPath: z.string().min(1),
  runtimeType: runtimeTypeSchema,
  lifecycle: runtimeLifecycleStateSchema,
  healthStatus: healthStatusSchema,
  containerId: z.string().min(1).nullable(),
  containerName: z.string().min(1).nullable(),
  processId: z.number().int().positive().nullable().default(null),
  assignedHostPort: z.number().int().min(1).max(65535).nullable(),
  preview: previewRegistrationPayloadSchema.nullable(),
  startedAt: z.string().datetime({ offset: true }).nullable(),
  lastError: z.string().min(1).nullable(),
});

export type RuntimeType = z.infer<typeof runtimeTypeSchema>;
export type EditorTarget = z.infer<typeof editorTargetSchema>;
export type WorkspaceBranchType = z.infer<typeof workspaceBranchTypeSchema>;
export type WorkspaceStatus = z.infer<typeof workspaceStatusSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type RuntimeLifecycleState = z.infer<typeof runtimeLifecycleStateSchema>;
export type PreviewProtocol = z.infer<typeof previewProtocolSchema>;
export type PreviewRouteStatus = z.infer<typeof previewRouteStatusSchema>;
export type AuthFlowType = z.infer<typeof authFlowTypeSchema>;
export type AuthSessionStatus = z.infer<typeof authSessionStatusSchema>;
export type AuthDeviceFlowStatus = z.infer<typeof authDeviceFlowStatusSchema>;
export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;
export type SharedRuntimeEnv = z.infer<typeof sharedRuntimeEnvSchema>;
export type MissionControlPublicEnv = z.infer<
  typeof missionControlPublicEnvSchema
>;
export type AgentdEnv = z.infer<typeof agentdEnvSchema>;
export type WorkspaceArtifactLayout = z.infer<
  typeof workspaceArtifactLayoutSchema
>;
export type CreateWorkspaceInput = z.input<typeof createWorkspaceInputSchema>;
export type DeleteWorkspaceInput = z.input<typeof deleteWorkspaceInputSchema>;
export type WorkspaceMetadata = z.infer<typeof workspaceMetadataSchema>;
export type WorkspaceLifecycleEventType = z.infer<
  typeof workspaceLifecycleEventTypeSchema
>;
export type WorkspaceLifecycleEvent = z.infer<
  typeof workspaceLifecycleEventSchema
>;
export type AuthError = z.infer<typeof authErrorSchema>;
export type AuthStatePayload = z.infer<typeof authStatePayloadSchema>;
export type AuthHandoffPayload = z.infer<typeof authHandoffPayloadSchema>;
export type AuthCallbackPayload = z.infer<typeof authCallbackPayloadSchema>;
export type AuthDeviceFlow = z.infer<typeof authDeviceFlowSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthSessionStartResponse = z.infer<
  typeof authSessionStartResponseSchema
>;
export type WorkspaceAuthSummary = z.infer<typeof workspaceAuthSummarySchema>;
export type AuthLifecycleEventType = z.infer<
  typeof authLifecycleEventTypeSchema
>;
export type AuthLifecycleEvent = z.infer<typeof authLifecycleEventSchema>;
export type TraceId = z.infer<typeof traceIdSchema>;
export type SpanId = z.infer<typeof spanIdSchema>;
export type AgentEventCategory = z.infer<typeof agentEventCategorySchema>;
export type AgentEventOutcome = z.infer<typeof agentEventOutcomeSchema>;
export type TraceSpanKind = z.infer<typeof traceSpanKindSchema>;
export type TraceStatusCode = z.infer<typeof traceStatusCodeSchema>;
export type RunStopReason = z.infer<typeof runStopReasonSchema>;
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export type PolicyAction = z.infer<typeof policyActionSchema>;
export type PolicyCategory = z.infer<typeof policyCategorySchema>;
export type EventAttributeValue = z.infer<typeof eventAttributeValueSchema>;
export type ModelUsage = z.infer<typeof modelUsageSchema>;
export type PolicyRule = z.infer<typeof policyRuleSchema>;
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;
export type AgentTraceSpan = z.infer<typeof agentTraceSpanSchema>;
export type AgentEvent = z.infer<typeof agentEventSchema>;
export type AgentRunBudget = z.infer<typeof agentRunBudgetSchema>;
export type AgentRunSummary = z.infer<typeof agentRunSummarySchema>;
export type CreateAgentRunInput = z.input<typeof createAgentRunInputSchema>;
export type RecordAgentEventInput = z.input<typeof recordAgentEventInputSchema>;
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;
export type ContainerRuntimeSpec = z.infer<typeof containerRuntimeSpecSchema>;
export type WorkspaceRuntimePort = z.infer<typeof workspaceRuntimePortSchema>;
export type WorkspaceRuntimeConfig = z.infer<typeof workspaceRuntimeConfigSchema>;
export type PreviewRouteRecord = z.infer<typeof previewRouteRecordSchema>;
export type PreviewRegistrationPayload = z.infer<
  typeof previewRegistrationPayloadSchema
>;
export type WorkspaceRuntimeState = z.infer<typeof workspaceRuntimeStateSchema>;

function normalizePreviewPath(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function createPreviewHost(
  workspaceSlug: string,
  previewDomain: string,
): string {
  return `${workspaceSlug}.${previewDomain}`;
}

export function createWorkspaceBranchName(
  branchType: WorkspaceBranchType,
  workspaceSlug: string,
): string {
  return `${branchType}/${workspaceSlug}`;
}

export function createAuthBrokerHost(previewDomain: string): string {
  return `auth.${previewDomain}`;
}

export function createAuthBrokerCallbackPath(
  provider: string,
  workspaceId: string,
): string {
  return `/callback/${provider}/${workspaceId}`;
}

export function createAuthBrokerCallbackUrl(
  authBrokerHost: string,
  provider: string,
  workspaceId: string,
  protocol: PreviewProtocol = "http",
): string {
  return `${protocol}://${authBrokerHost}${createAuthBrokerCallbackPath(
    provider,
    workspaceId,
  )}`;
}

export function createWorkspaceDataRoot(
  dataDir: string,
  workspaceId: string,
): string {
  return `${dataDir}/workspaces/${workspaceId}`;
}

export function createPreviewUrl(
  host: string,
  protocol: PreviewProtocol = "http",
  pathname: string = "/",
): string {
  return `${protocol}://${host}${normalizePreviewPath(pathname)}`;
}

export function createRuntimeTarget(
  port: number,
  host: string = "127.0.0.1",
): string {
  return `${host}:${port}`;
}

export function createManualFallbackUrl(
  target: string,
  protocol: PreviewProtocol = "http",
  pathname: string = "/",
): string {
  return `${protocol}://${target}${normalizePreviewPath(pathname)}`;
}

export function createRuntimeContainerName(
  workspaceId: string,
  workspaceSlug: string,
): string {
  return `takomi-${workspaceSlug}-${workspaceId}`.replace(/[^a-z0-9_.-]/gi, "-");
}

export function createPreviewRegistrationPayload(
  route: PreviewRouteRecord,
): PreviewRegistrationPayload {
  return previewRegistrationPayloadSchema.parse({
    workspaceId: route.workspaceId,
    host: route.host,
    url: createPreviewUrl(route.host, route.protocol),
    routeStatus: route.status,
    healthStatus: route.healthStatus,
    target: route.target,
    manualFallbackUrl: createManualFallbackUrl(
      route.target,
      route.protocol,
      route.healthPath,
    ),
    lastError: route.lastError,
  });
}
