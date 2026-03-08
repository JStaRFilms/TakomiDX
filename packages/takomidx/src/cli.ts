#!/usr/bin/env node

import { spawn } from "node:child_process";
import type { Readable } from "node:stream";
import { parseArgs } from "node:util";
import path from "node:path";

const args = process.argv.slice(2);
const command = args[0] ?? "help";

const agentdUrl = process.env.TAKOMI_AGENTD_URL || "http://127.0.0.1:4000";

interface WorkspaceRecord {
  id: string;
  slug: string;
  repoPath: string;
}

interface PreviewRegistrationOptions {
  protocol?: "http" | "https";
  healthPath?: string;
}

if (command === "help") {
  console.log(`TakomiDX Hybrid Attached/Managed Workspace CLI
Usage: takomi <command> [args]

Commands:
  run      Launch a TakomiDX-owned tracked command
  attach   Attach an existing agent session
  status   View workspace/run status
  open     Open preview or control plane
  logs     View observability agent events

Default agentd URL: ${agentdUrl}
`);
  process.exit(0);
}

async function getOrCreateWorkspace(
  repoPath: string,
  slug: string,
): Promise<WorkspaceRecord> {
  try {
    // Try to find existing workspace by slug
    const listRes = await fetch(`${agentdUrl}/api/v1/workspaces`);
    if (!listRes.ok) {
      throw new Error(`Failed to list workspaces: HTTP ${listRes.status}`);
    }
    const { items } = (await listRes.json()) as { items: WorkspaceRecord[] };
    const existing = items.find((ws) => ws.slug === slug || ws.repoPath === repoPath);

    if (existing) {
      return existing;
    }

    // Create new attached workspace
    const createRes = await fetch(`${agentdUrl}/api/v1/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        repoPath,
        mode: "attached",
      }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      throw new Error(`Failed to create workspace: HTTP ${createRes.status} - ${errorText}`);
    }

    return (await createRes.json()) as WorkspaceRecord;
  } catch (error) {
    throw new Error(`Workspace setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function resolveStringOption(
  values: Record<string, unknown>,
  primaryKey: string,
  fallbackKey?: string,
) {
  const primary = typeof values[primaryKey] === "string" ? values[primaryKey] : undefined;
  const fallback =
    fallbackKey && typeof values[fallbackKey] === "string" ? values[fallbackKey] : undefined;

  return primary ?? fallback;
}

function resolveNumberOption(
  values: Record<string, unknown>,
  key: string,
) {
  const value = resolveStringOption(values, key);
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for --${key}: ${value}`);
  }

  return parsed;
}

function resolveProtocolOption(
  values: Record<string, unknown>,
  key: string = "protocol",
) {
  return resolveStringOption(values, key) === "https" ? "https" : "http";
}

async function registerPreviewRoute(
  workspaceId: string,
  previewPort: number,
  options: PreviewRegistrationOptions = {},
) {
  const previewRes = await fetch(
    `${agentdUrl}/api/v1/workspaces/${workspaceId}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetPort: previewPort,
        protocol: options.protocol ?? "http",
        healthPath: options.healthPath ?? "/",
      }),
    },
  );

  if (!previewRes.ok) {
    throw new Error(
      `Failed to register preview route: HTTP ${previewRes.status} - ${await previewRes.text()}`,
    );
  }
}

function extractPreviewPort(output: string) {
  const urlMatches = output.matchAll(
    /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})(?:[/?\s]|$)/gi,
  );

  for (const match of urlMatches) {
    const previewPort = Number.parseInt(match[1] ?? "", 10);
    if (!Number.isNaN(previewPort)) {
      return previewPort;
    }
  }

  return null;
}

function pipeAndWatchStream(
  stream: Readable | null,
  destination: NodeJS.WriteStream,
  onOutput: (output: string) => void,
) {
  if (!stream) {
    return;
  }

  stream.setEncoding("utf8");
  stream.on("data", (chunk: string) => {
    destination.write(chunk);
    onOutput(chunk);
  });
}


try {
  if (command === "run") {
    const { values, positionals } = parseArgs({
      args: args.slice(1),
      options: {
        "workspace-id": { type: "string" },
        "agent-type": { type: "string", default: "CLI User" },
        label: { type: "string" },
        "tool-family": { type: "string", default: "takomi" },
        tool: { type: "string" },
        cwd: { type: "string", default: process.cwd() },
        "preview-port": { type: "string" },
        protocol: { type: "string" },
        "health-path": { type: "string" },
      },
      allowPositionals: true,
      strict: false,
    });

    const runCommandParts = positionals.filter((value) => value !== "--");
    if (runCommandParts.length === 0) {
      throw new Error("No command provided to run.");
    }
    const runCommand = runCommandParts.join(" ");

    const repoPath = path.resolve(values.cwd as string);
    const slug = path.basename(repoPath).toLowerCase().replace(/[^a-z0-9]/g, "-");
    const workspace = await getOrCreateWorkspace(repoPath, slug);
    const workspaceId = (values["workspace-id"] as string) || workspace.id;
    const agentType = resolveStringOption(values, "label", "agent-type") ?? "CLI User";
    const toolFamily = resolveStringOption(values, "tool", "tool-family") ?? "takomi";
    const explicitPreviewPort = resolveNumberOption(values, "preview-port");
    const previewOptions = {
      protocol: resolveProtocolOption(values),
      healthPath: resolveStringOption(values, "health-path") ?? "/",
    } satisfies PreviewRegistrationOptions;

    // 1. Initialise the run in agentd
    const runRes = await fetch(`${agentdUrl}/api/v1/observability/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        agentType,
        ownership: "owned",
        toolFamily,
        cwd: repoPath,
      }),
    });

    if (!runRes.ok) {
      const errorText = await runRes.text();
      throw new Error(`Failed to start run in agentd (HTTP ${runRes.status}): ${errorText}`);
    }

    const run = (await runRes.json()) as { id: string };
    const runId = run.id;

    console.log(`[takomi] Launching TakomiDX-owned tracked run: ${runId}`);
    console.log(`[takomi] Workspace: ${workspaceId} (${slug})`);

    // 2. Spawn the local process
    const child = spawn(runCommand, {
      cwd: repoPath,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    let registeredPreviewPort: number | null = null;
    let finalizedRun = false;

    const registerPreviewIfNeeded = async (previewPort: number) => {
      if (registeredPreviewPort === previewPort) {
        return;
      }

      try {
        await registerPreviewRoute(workspaceId, previewPort, previewOptions);
        registeredPreviewPort = previewPort;
        console.log(`[takomi] Registered preview route on port ${previewPort}.`);
      } catch (error) {
        console.warn(
          `[takomi] Warning: Could not register preview route for port ${previewPort}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    };

    if (explicitPreviewPort !== undefined) {
      void registerPreviewIfNeeded(explicitPreviewPort);
    }

    const handleOutput = (output: string) => {
      const detectedPreviewPort = extractPreviewPort(output);
      if (detectedPreviewPort !== null) {
        void registerPreviewIfNeeded(detectedPreviewPort);
      }
    };

    pipeAndWatchStream(child.stdout, process.stdout, handleOutput);
    pipeAndWatchStream(child.stderr, process.stderr, handleOutput);

    const recordRunEvent = async (input: Record<string, unknown>) => {
      const eventRes = await fetch(`${agentdUrl}/api/v1/observability/runs/${runId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!eventRes.ok) {
        throw new Error(`HTTP ${eventRes.status}`);
      }
    };

    const finalizeRun = async (input: {
      code?: number | null;
      signal?: NodeJS.Signals | null;
      cancelled?: boolean;
    }) => {
      if (finalizedRun) {
        return;
      }

      finalizedRun = true;

      if (input.cancelled) {
        try {
          await recordRunEvent({
            category: "run",
            type: "run.cancelled",
            source: "takomi-cli",
            summary: `Run stopped from the terminal${input.signal ? ` (${input.signal})` : ""}.`,
            outcome: "warn",
            attributes: {
              signal: input.signal ?? null,
            },
          });
        } catch {
          console.error("[takomi] Error: Network error while recording cancelled run state in agentd");
        }

        return;
      }

      const code = input.code ?? 0;
      console.log(`[takomi] Run ${runId} exited with code ${code}`);

      try {
        await recordRunEvent({
          category: "run",
          type: "process.exited",
          source: "takomi-cli",
          summary:
            code === 0
              ? "Process exited successfully. Run is waiting for validation or review."
              : `Process exited with code ${code}. Run needs attention before validation.`,
          detail: `Process exited with code ${code}.${input.signal ? ` Signal: ${input.signal}.` : ""}`,
          outcome: code === 0 ? "success" : "error",
          attributes: {
            exitCode: code,
            signal: input.signal ?? null,
          },
        });
      } catch {
        console.error("[takomi] Error: Network error while recording process exit in agentd");
      }

      if (code === 0) {
        console.log(
          "[takomi] Run remains open in TakomiDX until validation or review marks it complete.",
        );
      }
    };

    // Update agentd with PID if possible
    if (child.pid) {
      try {
        await recordRunEvent({
            category: "run",
            type: "process.started",
            source: "takomi-cli",
            summary: `Process ${child.pid} started`,
            attributes: { pid: child.pid },
        });
      } catch {
        console.warn(`[takomi] Warning: Network error while recording process.started event`);
      }
    }

    const handleSignal = (signal: NodeJS.Signals) => {
      process.once(signal, async () => {
        if (child.exitCode === null) {
          child.kill(signal === "SIGINT" ? "SIGINT" : "SIGTERM");
        }

        await finalizeRun({
          code: signal === "SIGINT" ? 130 : 143,
          signal,
          cancelled: true,
        });
        process.exit(signal === "SIGINT" ? 130 : 143);
      });
    };

    handleSignal("SIGINT");
    handleSignal("SIGTERM");
    handleSignal("SIGHUP");

    child.on("close", async (code, signal) => {
      await finalizeRun({
        code,
        signal,
      });
      process.exit(code ?? (signal ? 1 : 0));
    });

  } else if (command === "attach") {
    const { values } = parseArgs({
      args: args.slice(1),
      options: {
        "workspace-id": { type: "string" },
        "agent-type": { type: "string", default: "External Agent" },
        label: { type: "string" },
        "tool-family": { type: "string", default: "unknown" },
        tool: { type: "string" },
        cwd: { type: "string", default: process.cwd() },
        pid: { type: "string" },
        "preview-port": { type: "string" },
        protocol: { type: "string" },
        "health-path": { type: "string" },
      },
      strict: false,
    });

    const repoPath = path.resolve(values.cwd as string);
    const slug = path.basename(repoPath).toLowerCase().replace(/[^a-z0-9]/g, "-");
    const workspace = await getOrCreateWorkspace(repoPath, slug);
    const workspaceId = (values["workspace-id"] as string) || workspace.id;
    const agentType =
      resolveStringOption(values, "label", "agent-type") ?? "External Agent";
    const toolFamily =
      resolveStringOption(values, "tool", "tool-family") ?? "unknown";
    const pid = resolveNumberOption(values, "pid");

    console.log(`[takomi] Attaching external run to TakomiDX control plane for ${slug}.`);

    const attachRes = await fetch(`${agentdUrl}/api/v1/observability/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        agentType,
        ownership: "external",
        toolFamily,
        cwd: repoPath,
        pid,
      }),
    });

    if (!attachRes.ok) {
      throw new Error(`Failed to attach run in agentd: ${await attachRes.text()}`);
    }

    const run = (await attachRes.json()) as { id: string };
    console.log(`[takomi] Attached as run: ${run.id}`);

    const previewPort = resolveNumberOption(values, "preview-port");
    if (previewPort !== undefined) {
      await registerPreviewRoute(workspaceId, previewPort, {
        protocol: resolveProtocolOption(values),
        healthPath: resolveStringOption(values, "health-path") ?? "/",
      });

      console.log(`[takomi] Registered attached preview on port ${previewPort}.`);
    }
  } else {
    console.log(`[takomi] ${command} command executed against ${agentdUrl}.`);
    console.log(`Command logic for '${command}' not yet implemented in this milestone.`);
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
