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

const TAKOMI_COREPACK_CACHE_VOLUME = "takomi-corepack-cache";
const TAKOMI_COREPACK_CACHE_DIR = "/var/cache/takomi/corepack";
const TAKOMI_PNPM_STORE_VOLUME = "takomi-pnpm-store";
const TAKOMI_PNPM_STORE_DIR = "/var/cache/takomi/pnpm/store";

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

export interface ContainerInspectionResult {
  containerId: string;
  hostPort: number | null;
  isRunning: boolean;
  processId?: number | null;
}

export interface ContainerRuntimeDriver {
  start(input: ContainerStartRequest): Promise<ContainerStartResult>;
  inspect?(containerName: string): Promise<ContainerInspectionResult | null>;
  startExisting?(containerName: string): Promise<ContainerStartResult>;
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
    COREPACK_HOME: TAKOMI_COREPACK_CACHE_DIR,
    PNPM_STORE_DIR: TAKOMI_PNPM_STORE_DIR,
    npm_config_store_dir: TAKOMI_PNPM_STORE_DIR,
    pnpm_config_store_dir: TAKOMI_PNPM_STORE_DIR,
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

export async function readContainerLogs(containerName: string, tail: number = 120) {
  try {
    const stdout = await runCommand("docker", [
      "container",
      "logs",
      "--tail",
      String(tail),
      containerName,
    ]);
    return stdout;
  } catch (error) {
    return error instanceof Error ? error.message : "Failed to read container logs.";
  }
}

function parseDockerPortMapping(output: string): number {
  const match = output.match(/:(\d{1,5})$/m);

  if (!match) {
    throw new Error(`Could not parse Docker port mapping from "${output}".`);
  }

  return Number(match[1]);
}

function parseDockerInspectionPort(
  inspection: {
    NetworkSettings?: {
      Ports?: Record<string, Array<{ HostPort?: string }> | null>;
    };
  },
) {
  const ports = inspection.NetworkSettings?.Ports ?? {};

  for (const bindings of Object.values(ports)) {
    const hostPort = bindings?.[0]?.HostPort;

    if (hostPort) {
      return Number(hostPort);
    }
  }

  return null;
}

async function inspectContainer(containerName: string) {
  try {
    const output = await runCommand("docker", [
      "container",
      "inspect",
      containerName,
      "--format",
      "{{json .}}",
    ]);

    return JSON.parse(output) as {
      Id: string;
      State?: {
        Running?: boolean;
        Pid?: number;
      };
      NetworkSettings?: {
        Ports?: Record<string, Array<{ HostPort?: string }> | null>;
      };
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("No such object") || error.message.includes("No such container"))
    ) {
      return null;
    }

    throw error;
  }
}

function isDockerUnavailableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("docker daemon") ||
    message.includes("error during connect") ||
    message.includes("cannot connect to the docker daemon") ||
    message.includes("the system cannot find the file specified")
  );
}

export function createDockerContainerDriver(): ContainerRuntimeDriver {
  return {
    async start(input) {
      const { config, containerName, envFilePath } = input;
      const containerId = await runCommand("docker", [
        "container",
        "run",
        "--detach",
        "--name",
        containerName,
        "--workdir",
        config.container.workdir,
        "--publish",
        `127.0.0.1::${config.port.containerPort}/tcp`,
        "--mount",
        `type=bind,source=${config.repoPath},target=${config.container.workdir}`,
        "--mount",
        `type=volume,source=${TAKOMI_COREPACK_CACHE_VOLUME},target=${TAKOMI_COREPACK_CACHE_DIR}`,
        "--mount",
        `type=volume,source=${TAKOMI_PNPM_STORE_VOLUME},target=${TAKOMI_PNPM_STORE_DIR}`,
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

    async inspect(containerName) {
      const inspection = await inspectContainer(containerName);

      if (!inspection) {
        return null;
      }

      return {
        containerId: inspection.Id,
        hostPort: parseDockerInspectionPort(inspection),
        isRunning: inspection.State?.Running === true,
        processId:
          typeof inspection.State?.Pid === "number" && inspection.State.Pid > 0
            ? inspection.State.Pid
            : null,
      };
    },

    async startExisting(containerName) {
      await runCommand("docker", ["container", "start", containerName]);
      const inspection = await inspectContainer(containerName);

      if (!inspection) {
        throw new Error(`Runtime container ${containerName} could not be inspected after start.`);
      }

      const hostPort = parseDockerInspectionPort(inspection);

      if (!hostPort) {
        throw new Error(`Runtime container ${containerName} did not expose a host port.`);
      }

      return {
        containerId: inspection.Id,
        hostPort,
        processId:
          typeof inspection.State?.Pid === "number" && inspection.State.Pid > 0
            ? inspection.State.Pid
            : null,
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

  async function inspectRuntimeContainer(
    state: WorkspaceRuntimeState,
  ) {
    if (!state.containerName || !driver.inspect) {
      return null;
    }

    return driver.inspect(state.containerName);
  }

  async function probeRuntimeState(
    state: WorkspaceRuntimeState,
    config: WorkspaceRuntimeConfig,
  ) {
    let inspection: ContainerInspectionResult | null = null;

    try {
      inspection = driver.inspect ? await inspectRuntimeContainer(state) : null;
    } catch (error) {
      if (!driver.inspect || !isDockerUnavailableError(error)) {
        throw error;
      }

      const stoppedState = workspaceRuntimeStateSchema.parse({
        ...state,
        lifecycle: "stopped",
        healthStatus: "degraded",
        processId: null,
        lastError:
          "Docker is unavailable. Start Docker and restart the runtime to restore the preview.",
      });

      persistState(stoppedState);
      return stoppedState;
    }

    if (driver.inspect) {
      if (!inspection) {
        const missingState = workspaceRuntimeStateSchema.parse({
          ...state,
          lifecycle: "failed",
          healthStatus: "failed",
          assignedHostPort: null,
          processId: null,
          lastError: "Runtime container is missing. Start the runtime again to restore the preview.",
        });

        persistState(missingState);
        return missingState;
      }

      if (!inspection.isRunning) {
        const stoppedState = workspaceRuntimeStateSchema.parse({
          ...state,
          lifecycle: "stopped",
          healthStatus: "degraded",
          containerId: inspection.containerId,
          assignedHostPort: inspection.hostPort ?? state.assignedHostPort,
          processId: inspection.processId ?? null,
          lastError: "Runtime container is stopped. Start the runtime again to restore the preview.",
        });

        persistState(stoppedState);
        return stoppedState;
      }

      if (!inspection.hostPort) {
        const failedState = workspaceRuntimeStateSchema.parse({
          ...state,
          lifecycle: "failed",
          healthStatus: "failed",
          containerId: inspection.containerId,
          assignedHostPort: null,
          processId: inspection.processId ?? null,
          lastError: "Runtime container is running but no published host port was found.",
        });

        persistState(failedState);
        return failedState;
      }
    }

    const hostPort = inspection?.hostPort ?? state.assignedHostPort;

    if (!hostPort) {
      return state;
    }

    const target = createRuntimeTarget(hostPort);
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
      containerId: inspection?.containerId ?? state.containerId,
      assignedHostPort: hostPort,
      processId: inspection?.processId ?? state.processId ?? null,
      lifecycle: health.healthStatus === "healthy" ? "running" : "booting",
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
        const existingRuntime = runtimes.get(config.workspaceId) ?? null;
        const existingInspection =
          existingRuntime && existingRuntime.containerName === containerName
            ? await inspectRuntimeContainer(existingRuntime)
            : null;
        const result =
          existingInspection && existingInspection.isRunning
            ? {
              containerId: existingInspection.containerId,
              hostPort: existingInspection.hostPort ?? 0,
              processId: existingInspection.processId ?? null,
            }
            : existingInspection && !existingInspection.isRunning && driver.startExisting
            ? await driver.startExisting(containerName)
            : await driver.start({
              config,
              containerName,
              envFilePath,
              workspaceDir,
            });

        if (!result.hostPort) {
          throw new Error(`Runtime container ${containerName} did not expose a host port.`);
        }

        const startedState = workspaceRuntimeStateSchema.parse({
          ...bootingState,
          lifecycle: "booting",
          containerId: result.containerId,
          processId: result.processId ?? null,
          assignedHostPort: result.hostPort,
          startedAt: existingRuntime?.startedAt ?? now().toISOString(),
        });

        persistState(startedState);
        return await probeRuntimeState(startedState, config);
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

    async reconcileAll() {
      for (const workspaceId of Array.from(runtimes.keys())) {
        const config = configs.get(workspaceId);

        if (!config) {
          continue;
        }

        try {
          await this.refreshHealth(workspaceId);
        } catch {
          // Keep startup resilient if one runtime cannot be reconciled.
        }
      }
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
