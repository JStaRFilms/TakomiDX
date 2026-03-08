#!/usr/bin/env node

import { parseArgs } from "node:util";

const args = process.argv.slice(2);
const command = args[0] ?? "help";

const agentdUrl = process.env.TAKOMI_AGENTD_URL || "http://127.0.0.1:4000";

if (command === "help") {
  console.log(`TakomiDX Hybrid Attached/Managed Workspace CLI
Usage: takomi <command> [args]

Commands:
  run      Launch a Takomi-owned tracked command
  attach   Attach an existing agent session
  status   View workspace/run status
  open     Open preview or control plane
  logs     View observability agent events

Default agentd URL: ${agentdUrl}
`);
  process.exit(0);
}

try {
  if (command === "run") {
    const { values, positionals } = parseArgs({
      args: args.slice(1),
      options: {
        "workspace-id": { type: "string" },
        "agent-type": { type: "string", default: "CLI User" },
        "tool-family": { type: "string", default: "unknown" },
        cwd: { type: "string", default: process.cwd() },
      },
      allowPositionals: true,
      strict: false,
    });

    const runCommand = positionals.filter((value) => value !== "--").join(" ");
    console.log(`[takomi] Launching Takomi-owned tracked run: ${runCommand}`);
    console.log(`[takomi] Workspace: ${values["workspace-id"] || "auto-generated"}`);
    console.log(`[takomi] Agent Type: ${values["agent-type"]}`);
    console.log(`[takomi] Tool Family: ${values["tool-family"]}`);
    console.log(`[takomi] Working Directory: ${values.cwd}`);
    console.log(`[takomi] Agentd URL: ${agentdUrl}`);

    // Task 01 only scaffolds the CLI contract. Task 02 wires these commands to agentd.
  } else if (command === "attach") {
    const { values } = parseArgs({
      args: args.slice(1),
      options: {
        "workspace-id": { type: "string" },
        "agent-type": { type: "string" },
        "tool-family": { type: "string" },
        cwd: { type: "string" },
        pid: { type: "string" },
      },
    });

    console.log("[takomi] Attaching external run to Takomi control plane.");
    console.log(`[takomi] Agentd URL: ${agentdUrl}`);
    console.log(values);
  } else {
    console.log(`[takomi] ${command} command executed against ${agentdUrl}.`);
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
