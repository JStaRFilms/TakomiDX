# TakomiDX

**Run multiple coding agents locally without losing the plot.**

TakomiDX is a local-first control plane for multi-agent coding. It gives each task a durable workspace capsule with its own git worktree, isolated runtime, preview identity, auth routing, logs, validation evidence, and a single Mission Control surface to supervise it all.

Instead of juggling terminals, mystery ports, broken callbacks, and PRs you do not trust, TakomiDX makes each agent task feel like a first-class local object you can inspect, validate, and review.

**Last reviewed:** 2026-03-07

## Why It Exists

Modern coding agents are no longer the main bottleneck.

The bottleneck is the environment they run in.

Once you try to run more than one or two agent tasks locally, the workflow gets messy fast:

- ports collide
- previews drift
- OAuth callbacks land in the wrong place
- terminals stop being a useful source of truth
- agents feel opaque
- review quality drops because local validation is annoying

TakomiDX is built to solve that layer of the problem.

## What This Repo Contains

| Surface | Path | Role |
| --- | --- | --- |
| Mission Control | `apps/mission-control` | Next.js web app for creating and supervising workspace capsules |
| `agentd` | `services/agentd` | Local control-plane daemon and source of truth for workspace state |
| VS Code Companion | `apps/vscode-companion` | Read-only editor surface for previews, logs, traces, approvals, and deep links |
| Shared Contracts | `packages/contracts` | Shared schemas and types across the monorepo |
| Shared TS Config | `packages/tsconfig` | Shared TypeScript configuration package |

## What You Can Do Today

- create isolated local workspaces for parallel agent tasks
- supervise active workspaces from Mission Control instead of hunting through terminals
- run container-backed preview runtimes
- inspect workspace status, validation state, and approvals from the browser or VS Code
- generate browser-aware validation bundles against the reachable preview URL
- deep-link from VS Code into previews, logs, traces, worktrees, and Mission Control views

## Honest MVP Boundaries

TakomiDX is intentionally narrow right now:

- local-first, single-user workflow
- container runtime only
- VS Code is the only editor integration
- Mission Control is the primary product surface
- remote execution, microVM isolation, and team governance are future work

Preview hosts now run through a Takomi-owned local edge listener:

- `agentd` starts a machine-local HTTP proxy for `*.takomi.localhost`
- Mission Control and the VS Code companion prefer the custom host when that proxy is live
- the `127.0.0.1:<port>` fallback URL remains available only when the local edge proxy cannot bind or serve the route

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10.29.2+
- Docker Desktop running if you want browser runtime previews
- VS Code if you want to use the companion extension
- port `80` available if you want `http://<workspace-slug>.takomi.localhost/` to open without an explicit port

### 1. Configure the environment

Create a local env file from the template:

```bash
cp .env.example .env
```

Recommended minimum values are already documented in `.env.example`.

If you plan to use LLM-backed review flows, fill in:

- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `GROQ_API_KEY`

### 2. Install dependencies

```bash
pnpm bootstrap
```

### 3. Start the main local surfaces

```bash
pnpm dev
```

That starts:

- Mission Control at `http://127.0.0.1:3000`
- `agentd` at `http://127.0.0.1:4000`

## Common Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm check
```

VS Code companion commands:

```bash
pnpm --filter takomi-vscode-companion build
pnpm --filter takomi-vscode-companion typecheck
pnpm --filter takomi-vscode-companion test
```

## How It Works

TakomiDX is built around the idea of a **workspace capsule**.

Each workspace owns:

- a task identity
- a git worktree
- an isolated runtime
- preview URLs
- auth session routing
- logs and traces
- validation artifacts
- approval and review state

The user experience is simple:

1. Create a workspace for a task.
2. Let TakomiDX provision the worktree and runtime context.
3. Supervise status, preview, validation, and review state from one place.

The unit of the product is not a terminal tab. It is a task.

## Repo Layout

```text
apps/
  mission-control/
  vscode-companion/
services/
  agentd/
packages/
  contracts/
  tsconfig/
docs/
  features/
  issues/
  design/
```

## Runtime Notes

Mission Control's browser-side `Start Runtime` flow currently boots a Docker container for the workspace preview.

Keep these constraints in mind:

- Docker Desktop must be installed and running before you use runtime controls
- the first runtime boot needs network access to pull `node:22-alpine`
- the current default image is about 57 MB compressed on `linux/amd64`
- fresh worktrees do not include `node_modules`, so first boot installs dependencies
- shared Docker volumes cache `corepack` and the pnpm store for later runs
- workspace `node_modules` stays in the mounted workspace between container restarts
- the local edge listener defaults to `127.0.0.1:80`, so any other process on port `80` will force Takomi to surface the fallback preview URL instead

Recommended first-run check:

```powershell
docker pull node:22-alpine
```

Default runtime commands:

```text
Next.js: sh -lc "corepack enable && pnpm install && pnpm dev --hostname 0.0.0.0 --port 3000"
Vite:    sh -lc "corepack enable && pnpm install && pnpm dev --host 0.0.0.0 --port 5173"
```

Practical rule:

- run `Start Runtime` before `Run Validation`, otherwise validation will be blocked because there is no reviewable preview yet
- once the runtime health check passes, open `http://<workspace-slug>.takomi.localhost/` first and only drop to `127.0.0.1:<port>` if Mission Control reports the local edge proxy as unavailable

Local edge overrides:

- `TAKOMI_EDGE_HOST` changes the bind host for the preview listener
- `TAKOMI_EDGE_PORT` changes the bind port; use the default `80` if you want clean `.localhost` URLs without adding a port in the browser

## Tech Stack

- pnpm workspace monorepo
- Turbo
- TypeScript
- Next.js App Router
- React 19
- Tailwind CSS 4
- Node.js service shell for `agentd`
- Vitest
- Zod shared contracts

## Docs Worth Reading

- [Product brief](docs/Founder_Investor_Product_Brief.md)
- [Project requirements](docs/Project_Requirements.md)
- [Platform spec](docs/features/TakomiDX_Agent_Workspace_Platform_Spec.md)
- [VS Code companion spec](docs/features/VSCode_Companion.md)
- [Builder prompt](docs/Builder_Prompt.md)
- [Coding guidelines](docs/Coding_Guidelines.md)

## Current Direction

The near-term goal is straightforward:

Make local multi-agent coding trustworthy.

That means better runtime identity, better routing, better auth handling, better observability, and better validation loops before anything gets called "done."

## License

Personal project.
