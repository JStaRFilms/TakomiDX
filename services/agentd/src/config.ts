import {
  agentdEnvSchema,
  createAuthBrokerHost,
  sharedRuntimeEnvSchema,
  type EditorTarget,
  type RuntimeType,
} from "@takomi/contracts";
import path from "node:path";

export interface AgentdConfig {
  appName: string;
  authBrokerHost: string;
  dataDir: string;
  edgeHost: string;
  edgePort: number;
  editorTarget: EditorTarget;
  host: string;
  port: number;
  previewDomain: string;
  runtimeBackend: RuntimeType;
  stateDbPath: string;
  stateDir: string;
  routesDir: string;
  runsDir: string;
  worktreeRootDir: string;
  workspacesDir: string;
}

export function loadAgentdConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): AgentdConfig {
  const shared = sharedRuntimeEnvSchema.parse({
    TAKOMI_APP_NAME: env.TAKOMI_APP_NAME,
    TAKOMI_DATA_DIR: env.TAKOMI_DATA_DIR,
    TAKOMI_PREVIEW_DOMAIN: env.TAKOMI_PREVIEW_DOMAIN,
    TAKOMI_RUNTIME_BACKEND: env.TAKOMI_RUNTIME_BACKEND,
    TAKOMI_EDITOR_TARGET: env.TAKOMI_EDITOR_TARGET,
  });
  const agentd = agentdEnvSchema.parse({
    TAKOMI_AGENTD_HOST: env.TAKOMI_AGENTD_HOST,
    TAKOMI_AGENTD_PORT: env.TAKOMI_AGENTD_PORT,
    TAKOMI_EDGE_HOST: env.TAKOMI_EDGE_HOST,
    TAKOMI_EDGE_PORT: env.TAKOMI_EDGE_PORT,
  });

  const dataDir = path.resolve(cwd, shared.TAKOMI_DATA_DIR);
  const stateDir = path.join(dataDir, "state");
  const workspacesDir = path.join(dataDir, "workspaces");
  const worktreeRootDir = path.join(dataDir, "worktrees");
  const runsDir = path.join(dataDir, "runs");
  const routesDir = path.join(dataDir, "routes");

  return {
    appName: shared.TAKOMI_APP_NAME,
    authBrokerHost: createAuthBrokerHost(shared.TAKOMI_PREVIEW_DOMAIN),
    dataDir,
    edgeHost: agentd.TAKOMI_EDGE_HOST,
    edgePort: agentd.TAKOMI_EDGE_PORT,
    editorTarget: shared.TAKOMI_EDITOR_TARGET,
    host: agentd.TAKOMI_AGENTD_HOST,
    port: agentd.TAKOMI_AGENTD_PORT,
    previewDomain: shared.TAKOMI_PREVIEW_DOMAIN,
    routesDir,
    runsDir,
    runtimeBackend: shared.TAKOMI_RUNTIME_BACKEND,
    stateDbPath: path.join(stateDir, "agentd.db"),
    stateDir,
    worktreeRootDir,
    workspacesDir,
  };
}
