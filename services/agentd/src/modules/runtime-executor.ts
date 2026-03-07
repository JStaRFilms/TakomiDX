import {
  createManualFallbackUrl,
  createRuntimeContainerName,
  createRuntimeTarget,
  workspaceRuntimeConfigSchema,
  workspaceRuntimeStateSchema,
  type HealthStatus,
  type PreviewRegistrationPayload,
  type WorkspaceRuntimeConfig,
  type WorkspaceRuntimeState,
} from "@takomi/contracts";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface ContainerStartRequest {
  config: WorkspaceRuntimeConfig;
  containerName: string;
  envFilePath: string;
  workspaceDir: string;
}

export interface ContainerStartResult {
  containerId: string;
  hostPort: number;
  processId?: number | null;
}

export interface ContainerRuntimeDriver {
  start(input: ContainerStartRequest): Promise<ContainerStartResult>;
}

export interface CreateRuntimeExecutorOptions {
  workspacesDir: string;
  driver?: ContainerRuntimeDriver;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  onStateChange?: (input: {
    current: WorkspaceRuntimeState;
    previous: WorkspaceRuntimeState | null;
    config: WorkspaceRuntimeConfig | null;
  }) => void;
}

export class RuntimeBootError extends Error {
  constructor(
    message: string,
    public readonly state: WorkspaceRuntimeState,
  ) {
    super(message);
    this.name = "RuntimeBootError";
  }
}

function writeRuntimeEnvFile(
  filePath: string,
  config: WorkspaceRuntimeConfig,
  containerName: string,
) {
  const entries = {
    ...config.env,
    PORT: String(config.port.containerPort),
    TAKOMI_RUNTIME_CONTAINER_NAME: containerName,
    TAKOMI_WORKSPACE_ID: config.workspaceId,
    TAKOMI_WORKSPACE_SLUG: config.workspaceSlug,
    TAKOMI_PREVIEW_HOST: config.previewHost,
  };

  const lines = Object.entries(entries).map(
    ([key, value]) => `${key}=${String(value).replace(/\r?\n/g, "\\n")}`,
  );

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}

function writeJsonFile(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

async function runCommand(command: string, args: string[]) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    const failure = stderr.trim() || stdout.trim() || "Command failed.";
    throw new Error(failure);
  }

  return stdout.trim();
}

function parseDockerPortMapping(output: string): number {
  const match = output.match(/:(\d{1,5})$/m);

  if (!match) {
    throw new Error(`Could not parse Docker port mapping from "${output}".`);
  }

  return Number(match[1]);
}

export function createDockerContainerDriver(): ContainerRuntimeDriver {
  return {
    async start(input) {
      const { config, containerName, envFilePath } = input;
      const containerId = await runCommand("docker", [
        "container",
        "run",
        "--detach",
        "--rm",
        "--name",
        containerName,
        "--workdir",
        config.container.workdir,
        "--publish",
        `127.0.0.1::${config.port.containerPort}/tcp`,
        "--mount",
        `type=bind,source=${config.repoPath},target=${config.container.workdir}`,
        "--env-file",
        envFilePath,
        config.container.image,
        ...config.container.command,
      ]);

      const portOutput = await runCommand("docker", [
        "container",
        "port",
        containerId,
        `${config.port.containerPort}/tcp`,
      ]);

      return {
        containerId,
        hostPort: parseDockerPortMapping(portOutput),
        processId: null,
      };
    },
  };
}

async function probePreviewHealth(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{ healthStatus: HealthStatus; lastError: string | null }> {
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      signal: AbortSignal.timeout(1000),
    });

    return {
      healthStatus: response.ok ? "healthy" : "degraded",
      lastError: response.ok ? null : `Preview responded with ${response.status}.`,
    };
  } catch (error) {
    return {
      healthStatus: "degraded",
      lastError:
        error instanceof Error
          ? error.message
          : "Preview health probe failed unexpectedly.",
    };
  }
}

export function createRuntimeExecutor(options: CreateRuntimeExecutorOptions) {
  const driver = options.driver ?? createDockerContainerDriver();
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const runtimes = new Map<string, WorkspaceRuntimeState>();
  const configs = new Map<string, WorkspaceRuntimeConfig>();

  function getStatePath(workspaceId: string) {
    return path.join(options.workspacesDir, workspaceId, "runtime-state.json");
  }

  function getConfigPath(workspaceId: string) {
    return path.join(options.workspacesDir, workspaceId, "runtime-config.json");
  }

  function persistConfig(config: WorkspaceRuntimeConfig) {
    writeJsonFile(getConfigPath(config.workspaceId), config);
    configs.set(config.workspaceId, config);
  }

  function persistState(state: WorkspaceRuntimeState) {
    const previous = runtimes.get(state.workspaceId) ?? null;
    writeJsonFile(getStatePath(state.workspaceId), state);
    runtimes.set(state.workspaceId, state);
    options.onStateChange?.({
      current: state,
      previous,
      config: configs.get(state.workspaceId) ?? null,
    });
  }

  function listPersistedWorkspaceIds() {
    mkdirSync(options.workspacesDir, { recursive: true });

    return readdirSync(options.workspacesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }

  function restorePersistedRuntimes() {
    for (const workspaceId of listPersistedWorkspaceIds()) {
      const statePath = getStatePath(workspaceId);
      const configPath = getConfigPath(workspaceId);

      try {
        const restoredState = workspaceRuntimeStateSchema.parse(
          readJsonFile<unknown>(statePath),
        );
        runtimes.set(restoredState.workspaceId, restoredState);
      } catch {
        // Ignore invalid or missing state files during restore.
      }

      try {
        const restoredConfig = workspaceRuntimeConfigSchema.parse(
          readJsonFile<unknown>(configPath),
        );
        configs.set(restoredConfig.workspaceId, restoredConfig);
      } catch {
        // Ignore invalid or missing config files during restore.
      }
    }
  }

  restorePersistedRuntimes();

  async function probeRuntimeState(
    state: WorkspaceRuntimeState,
    config: WorkspaceRuntimeConfig,
  ) {
    if (!state.assignedHostPort) {
      return state;
    }

    const target = createRuntimeTarget(state.assignedHostPort);
    const health = await probePreviewHealth(
      createManualFallbackUrl(
        target,
        config.port.protocol,
        config.healthCheckPath,
      ),
      fetchImpl,
    );

    const nextState = workspaceRuntimeStateSchema.parse({
      ...state,
      healthStatus: health.healthStatus,
      lastError: health.lastError,
    });

    persistState(nextState);
    return nextState;
  }

  return {
    async boot(input: WorkspaceRuntimeConfig) {
      const config = workspaceRuntimeConfigSchema.parse(input);
      const workspaceDir = path.join(options.workspacesDir, config.workspaceId);
      const containerName = createRuntimeContainerName(
        config.workspaceId,
        config.workspaceSlug,
      );
      const envFilePath = path.join(workspaceDir, "runtime.env");

      persistConfig(config);
      writeRuntimeEnvFile(envFilePath, config, containerName);

      const bootingState = workspaceRuntimeStateSchema.parse({
        workspaceId: config.workspaceId,
        workspaceSlug: config.workspaceSlug,
        repoPath: config.repoPath,
        runtimeType: config.runtimeType,
        lifecycle: "booting",
        healthStatus: "degraded",
        containerId: null,
        containerName,
        processId: null,
        assignedHostPort: null,
        preview: null,
        startedAt: null,
        lastError: null,
      });

      persistState(bootingState);

      try {
        const result = await driver.start({
          config,
          containerName,
          envFilePath,
          workspaceDir,
        });

        const runningState = workspaceRuntimeStateSchema.parse({
          ...bootingState,
          lifecycle: "running",
          containerId: result.containerId,
          processId: result.processId ?? null,
          assignedHostPort: result.hostPort,
          startedAt: now().toISOString(),
        });

        persistState(runningState);
        return await probeRuntimeState(runningState, config);
      } catch (error) {
        const failedState = workspaceRuntimeStateSchema.parse({
          ...bootingState,
          lifecycle: "failed",
          healthStatus: "failed",
          startedAt: now().toISOString(),
          lastError:
            error instanceof Error
              ? error.message
              : "Runtime boot failed unexpectedly.",
        });

        persistState(failedState);
        throw new RuntimeBootError(
          `Failed to boot runtime for ${config.workspaceId}.`,
          failedState,
        );
      }
    },

    attachPreview(
      workspaceId: string,
      preview: PreviewRegistrationPayload,
    ): WorkspaceRuntimeState | null {
      const current = runtimes.get(workspaceId);

      if (!current) {
        return null;
      }

      const nextState = workspaceRuntimeStateSchema.parse({
        ...current,
        healthStatus: preview.healthStatus,
        lastError: preview.lastError,
        preview,
      });

      persistState(nextState);
      return nextState;
    },

    async refreshHealth(workspaceId: string) {
      const current = runtimes.get(workspaceId);
      const config = configs.get(workspaceId);

      if (!current || !config) {
        return null;
      }

      return probeRuntimeState(current, config);
    },

    get(workspaceId: string) {
      return runtimes.get(workspaceId) ?? null;
    },

    list() {
      return Array.from(runtimes.values());
    },
  };
}

export type RuntimeExecutor = ReturnType<typeof createRuntimeExecutor>;

export function createRuntimeExecutorBoundary(runtimeCount: number = 0) {
  return {
    name: "runtime-executor",
    note: "Boots isolated container runtimes and tracks preview health.",
    status: "ready",
    activeRuntimes: runtimeCount,
  } as const;
}
