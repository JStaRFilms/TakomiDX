import { z } from "zod";

export const workspaceIdSchema = z.string().regex(/^ws_[a-z0-9]{8,}$/);
export const runIdSchema = z.string().regex(/^run_[a-z0-9]{8,}$/);
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
