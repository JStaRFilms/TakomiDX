# TakomiDX

**The CLI-First Local Control Plane for Managed and Attached Agent Workspaces.**

TakomiDX is a local control plane for multi-agent coding. It gives you terminal-native observability and lifecycle management for both TakomiDX-managed task capsules and existing projects where you've "attached" TakomiDX to track and validate agent runs.

Instead of juggling mystery ports, drifting previews, and unverified PRs, TakomiDX makes every agent task—whether it's running in a managed container or directly in your current directory—a first-class local object you can inspect, validate, and review.

**Last reviewed:** 2026-03-08 (CLI Pivot Milestone)

## Why It Exists

Modern coding agents are no longer the bottleneck. The bottleneck is the **environment** and the **supervision loop**.

When you move beyond simple "edit-this-file" tasks to running multiple agents or complex multi-step workflows (like Codex or Claude Code), everything gets messy:
- ports collide
- preview URLs are unstable
- auth callbacks land in the wrong place
- you lose track of cost and progress across parallel runs
- you end up with "PR dumping" where you don't trust the code enough to merge it

TakomiDX provides the infrastructure to make these agent workflows trustworthy, observable, and repeatable.

## What This Repo Contains

| Surface | Path | Role |
| --- | --- | --- |
| **CLI (`takomi`)** | `packages/takomidx` | **Primary direction.** Scaffolded terminal entrypoints for `run`, `attach`, `status`, `open`, and `logs`. |
| `agentd` | `services/agentd` | Local control-plane daemon and source of truth for all runs and state. |
| Mission Control | `apps/mission-control` | Secondary observability surface for reviewing traces, validation bundles, and histories. |
| VS Code Companion | `apps/vscode-companion` | Companion surface for status, previews, and deep-linking into Mission Control. |

## The Hybrid Model

TakomiDX supports two primary modes:

1. **Managed Workspaces (`managed`)**: Fully orchestrated task capsules. TakomiDX creates a dedicated `git worktree`, boots an isolated container runtime, and manages the lifecycle through the existing managed-workspace surfaces.
2. **Attached Projects (`attached`)**: TakomiDX tracks runs against your existing local project so the terminal, Mission Control, and VS Code all share the same workspace identity.

## Core Workflows

### 1. Codex / CLI Wrapper Flow
The approved terminal-native entrypoint for owned runs is `takomi run`:
```bash
takomi run -- "claude fix the styling on the checkout page"
```

### 2. Attached Project Flow
The approved terminal-native entrypoint for external sessions is `takomi attach`:
```bash
takomi attach
```

### 3. Managed Workspace Flow
Managed workspaces remain part of the product model, but this repo milestone does not yet expose a `takomi create` command. In the current repo, managed provisioning still happens through the existing managed-workspace surfaces while the CLI-first pivot focuses on `run` and `attach`.

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10.29.2+
- Docker Desktop running if you want browser runtime previews
- VS Code if you want to use the companion extension
- port `80` available if you want `http://<workspace-slug>.takomi.localhost/` to open without an explicit port

### 1. Install and Bootstrap
```bash
pnpm install
pnpm bootstrap
```

### 2. Start the Control Plane
```bash
pnpm dev
```
This starts:
- `agentd` (Local API and Source of Truth) at `http://127.0.0.1:4000`
- Mission Control (Observability UI) at `http://127.0.0.1:3000`

### 3. Build the CLI
```bash
cd packages/takomidx
pnpm build
# Optional: link the binary
pnpm link --global
```

## Common Commands

```bash
# Core dev loop
pnpm dev
pnpm build
pnpm check

# CLI Usage (current scaffold)
takomi help
takomi status
takomi run -- "your agent command here"
takomi attach
takomi open
takomi logs
```

## How It Works

TakomiDX is built around the **Run Capsule**. 

Every agent execution is recorded as a **Run** within a **Workspace**. 
- A **Managed Workspace** owns its worktree and runtime. 
- An **Attached Workspace** maps to an existing directory on your machine.

Each run automatically captures:
- Tool calls and reasoning traces
- Token usage and cost
- Runtime logs
- Browser-aware validation (screenshots, console errors)
- Approval and review status

## Repo Layout
```text
apps/
  mission-control/        # Secondary review surface
  vscode-companion/       # Editor companion
services/
  agentd/                 # Main control-plane daemon
packages/
  takomidx/               # Primary CLI package
  contracts/              # Shared Zod schemas
  tsconfig/               # Shared TS configuration
docs/
  features/               # Detailed product specs
  tasks/                  # Current development tasks
```

## Current Milestone: CLI-First Pivot
The current milestone focuses on making the CLI the primary driver for agent tasks. Mission Control is being reframed as a "review plane" rather than the "creation plane."

Today, that means the repo has:
- a scaffolded `takomi` CLI package centered on `run`, `attach`, `status`, `open`, and `logs`
- `agentd` support for attached vs managed workspace modeling
- Mission Control and the VS Code companion repositioned around hybrid tracking and review

**Deferred:**
- Native chat-shell implementation
- microVM runtime isolation (MVP uses containers or host side-by-side)
- Multi-user collaboration

## License
Personal project.
