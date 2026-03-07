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
