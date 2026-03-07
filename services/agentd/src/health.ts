import type { AgentdConfig } from "./config";

export function buildHealthPayload(config: AgentdConfig) {
  return {
    appName: config.appName,
    authBrokerHost: config.authBrokerHost,
    dataDir: config.dataDir,
    edgeHost: config.edgeHost,
    edgePort: config.edgePort,
    editorTarget: config.editorTarget,
    previewDomain: config.previewDomain,
    runtimeBackend: config.runtimeBackend,
    service: "agentd",
    status: "ok",
  };
}
