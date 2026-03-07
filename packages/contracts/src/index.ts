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

export type RuntimeType = z.infer<typeof runtimeTypeSchema>;
export type EditorTarget = z.infer<typeof editorTargetSchema>;
export type WorkspaceStatus = z.infer<typeof workspaceStatusSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type SharedRuntimeEnv = z.infer<typeof sharedRuntimeEnvSchema>;
export type MissionControlPublicEnv = z.infer<
  typeof missionControlPublicEnvSchema
>;
export type AgentdEnv = z.infer<typeof agentdEnvSchema>;
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;

export function createPreviewHost(
  workspaceSlug: string,
  previewDomain: string,
): string {
  return `${workspaceSlug}.${previewDomain}`;
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
