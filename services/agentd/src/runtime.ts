import type { AgentdConfig } from "./config";
import { mkdirSync } from "node:fs";

export function ensureRuntimeLayout(config: AgentdConfig) {
  for (const directory of [
    config.dataDir,
    config.stateDir,
    config.workspacesDir,
    config.worktreeRootDir,
    config.runsDir,
    config.routesDir,
  ]) {
    mkdirSync(directory, { recursive: true });
  }
}
