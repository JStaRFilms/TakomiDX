# Architecture: Foundation and Repo Scaffold

**Date:** 2026-03-07  
**Workflow:** `takomi / mode-architect`  
**Task:** `01_foundation_and_repo_scaffold`

## Overview

This foundation locks the MVP repo shape for TakomiDX so later tasks can build against stable app boundaries, package names, environment rules, and runtime directories without revisiting the base architecture.

## Goals

- establish one pnpm workspace monorepo for all MVP surfaces
- make Mission Control web-first for MVP
- provide a runnable `agentd` shell with health and config loading
- centralize contracts, naming rules, and environment schemas
- define local runtime data conventions for workspaces, runs, and artifacts

## Non-Goals

- microVM implementation
- remote execution
- JetBrains or non-VS Code editor support
- auth broker logic beyond placeholder boundaries
- proxy routing logic beyond placeholder boundaries
- deep Mission Control DX implementation

## MVP Decisions

### Repo layout

```text
apps/
  mission-control/   # Next.js App Router shell
services/
  agentd/            # Local control-plane daemon shell
packages/
  contracts/         # shared schemas, types, naming helpers
  tsconfig/          # shared TypeScript baselines
```

### Stack

- Package manager: `pnpm`
- Workspace task runner: `turbo`
- Mission Control: `Next.js` App Router + React
- Shared validation and contracts: `TypeScript` + `zod`
- `agentd` shell: `TypeScript` on Node.js for MVP scaffold speed and shared contracts reuse

`agentd` may move to Go or Rust later without changing the surface contract. For this task, the service shell exists to lock the local API boundary and boot flow, not to finalize the runtime language.

### Naming conventions

- Workspace IDs: `ws_<lowercase-alnum>`
- Run IDs: `run_<lowercase-alnum>`
- Workspace slugs: lowercase kebab case
- Preview hostnames: `<workspace-slug>.<preview-domain>`
- Auth broker host reservation: `auth.<preview-domain>`
- Artifact root: `.takomi/workspaces/<workspace-id>/artifacts`

### Local data strategy

Runtime metadata is stored under `.takomi/` at the repo root by default:

```text
.takomi/
  state/
    agentd.db
  workspaces/
    <workspace-id>/
      logs/
      traces/
      review/
      browser/
      artifacts/
  routes/
  runs/
```

The path is configurable with `TAKOMI_DATA_DIR`, but all defaults and docs assume `.takomi/`.

### Environment strategy

- Shared defaults live in the root `.env.example`.
- Mission Control reads only `NEXT_PUBLIC_*` values plus shared preview metadata.
- `agentd` reads `TAKOMI_AGENTD_*` values and shared runtime settings.
- Shared schema fragments live in `@takomi/contracts` and each surface extends only what it needs.

## Surface Boundaries

### `apps/mission-control`

- workspace grid shell
- workspace detail route shell
- placeholder panels for activity, review, and validation
- no live orchestration logic in this task

### `services/agentd`

- config loader
- health endpoint
- placeholder module boundaries for workspace manager, runtime registry, and route registry
- no real orchestration, proxy, or auth work in this task

### `packages/contracts`

- shared zod schemas
- stable enums and interfaces
- naming helpers for workspace IDs, slugs, preview hosts, and local paths

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Overdesigning package boundaries too early | slows later implementation | keep only `contracts` and `tsconfig` as shared packages |
| Picking a final daemon language too early | unnecessary rewrite risk | lock the HTTP/config contract first, defer runtime-language finalization |
| Ambiguous local data paths | later feature drift | define `.takomi/` as the default now and use shared helpers |

## Implementation Plan

1. Add monorepo root config and shared TypeScript baselines.
2. Add `@takomi/contracts` for schemas and naming rules.
3. Scaffold the Next.js Mission Control shell.
4. Scaffold the `agentd` service shell.
5. Add lint, typecheck, build, and test scripts at root and workspace level.
6. Verify `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
