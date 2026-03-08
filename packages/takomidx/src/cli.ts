#!/usr/bin/env node

import { spawn } from "node:child_process";
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
      stdio: "inherit",
      shell: true,
    });

    // Update agentd with PID if possible
    if (child.pid) {
      try {
        const eventRes = await fetch(`${agentdUrl}/api/v1/observability/runs/${runId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "run",
            type: "process.started",
            summary: `Process ${child.pid} started`,
            attributes: { pid: child.pid },
          }),
        });
        if (!eventRes.ok) {
          console.warn(`[takomi] Warning: Could not record process.started event (${eventRes.status})`);
        }
      } catch {
        console.warn(`[takomi] Warning: Network error while recording process.started event`);
      }
    }

    child.on("close", async (code) => {
      console.log(`[takomi] Run ${runId} exited with code ${code}`);

      // Record process exit without forcing run completion before validation.
      try {
        const exitEventRes = await fetch(`${agentdUrl}/api/v1/observability/runs/${runId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "run",
            type: "process.exited",
            source: "takomi-cli",
            summary:
              code === 0
                ? "Process exited successfully. Run is waiting for validation or review."
                : `Process exited with code ${code}. Run needs attention before validation.`,
            detail: `Process exited with code ${code}.`,
            outcome: code === 0 ? "success" : "error",
            attributes: {
              exitCode: code ?? 0,
            },
          }),
        });
        if (!exitEventRes.ok) {
          console.error(
            `[takomi] Error: Failed to record process exit in agentd (${exitEventRes.status})`,
          );
        }
      } catch {
        console.error(`[takomi] Error: Network error while recording process exit in agentd`);
      }

      if (code === 0) {
        console.log(
          "[takomi] Run remains open in TakomiDX until validation or review marks it complete.",
        );
      }

      process.exit(code ?? 0);
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
      const previewRes = await fetch(
        `${agentdUrl}/api/v1/workspaces/${workspaceId}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetPort: previewPort,
            protocol:
              resolveStringOption(values, "protocol") === "https" ? "https" : "http",
            healthPath: resolveStringOption(values, "health-path") ?? "/",
          }),
        },
      );

      if (!previewRes.ok) {
        throw new Error(
          `Failed to register preview route: HTTP ${previewRes.status} - ${await previewRes.text()}`,
        );
      }

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
