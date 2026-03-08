# Task 02: Agentd Attach, Process Tracking, and Non-Container Preview Registration API

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Keep server changes aligned with the approved workflow pivot |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Keep API boundaries and read models coherent for downstream consumers |

## Objective

Extend `agentd` so it can create or reuse attached workspaces, track Takomi-launched or externally attached local runs, and register preview routes for non-container local processes.

## Priority

P0

## Scope

Included:

- add `agentd` endpoints and persistence for attached workspaces and tracked runs
- support Takomi-owned launched runs and external attached runs
- capture metadata such as tool family, cwd, pid, preview port, and log availability
- allow preview registration for ordinary local processes rather than only container-backed runtime targets
- preserve existing managed runtime APIs where they are still valid

Excluded:

- replacing the existing runtime executor for managed containers
- implementing remote execution
- implementing process sandboxing beyond the current local-first scope

## Current State Analysis

### Completed

- `agentd` already manages workspaces, runtime state, route registration, auth flows, validation, and editor read models.
- The local edge proxy and route registry already support stable hostname routing once a target exists.
- Observability and validation bundles already store run-oriented state.

### Gap To Close

- The server assumes a managed-workspace-first lifecycle.
- There is no run model for externally attached sessions that Takomi did not start.
- Preview registration is still framed around the current runtime executor path.

## Requirements

### Functional Requirements

- **[REQ-001]** `agentd` must support creating or reusing an attached workspace for the current repo/cwd.
- **[REQ-002]** `agentd` must support launching a run and attaching a pre-existing run with explicit metadata.
- **[REQ-003]** `agentd` must record whether a run is Takomi-owned or externally attached.
- **[REQ-004]** `agentd` must register preview hosts for attached local process targets when a preview port is provided.
- **[REQ-005]** Existing managed workspace and managed runtime flows must keep working.

### Technical Requirements

- **[TECH-001]** Persist attached run metadata in a way that can restore state cleanly on restart.
- **[TECH-002]** Avoid overloading container runtime state with external-process semantics where a separate tracked-run model is clearer.
- **[TECH-003]** Make read models explicit enough that UI layers can distinguish stop/log capabilities.
- **[TECH-004]** Add tests for the new attach and preview registration flows.

## Implementation Plan

### Phase 1: Server-side model

- [ ] Introduce attached workspace and tracked run records in `agentd`.
- [ ] Decide which existing persistence files are extended vs which new files are added.
- [ ] Define restoration behavior on daemon restart.

### Phase 2: API and execution path

- [ ] Add endpoints for launch, attach, list, detail, and log retrieval where applicable.
- [ ] Add support for preview target registration from local process metadata.
- [ ] Make sure Takomi-owned process termination behavior is explicit and external runs are never killed implicitly.

### Phase 3: Read models and compatibility

- [ ] Update Mission Control and editor read-model builders with the new run metadata.
- [ ] Preserve existing managed runtime detail payloads or version them safely if necessary.
- [ ] Make compatibility fallback behavior explicit.

### Phase 4: Verification

- [ ] Add automated coverage for attach, restore, and preview registration.
- [ ] Verify current managed runtime tests still pass.

## Files To Inspect First

- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/server.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/modules/workspace-manager.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/modules/runtime-executor.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/modules/route-registry.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/modules/editor-companion.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/packages/contracts/src/index.ts`

## Definition of Done

- `agentd` can create/reuse attached workspaces
- `agentd` can track launched and attached runs with explicit ownership metadata
- preview routes work for non-container local processes
- current managed workspace APIs still function

## Verification Steps

- run `pnpm --filter agentd test`
- run `pnpm --filter agentd typecheck`
- verify launch and attach flows through the new endpoints
- verify managed runtime tests or core flows still pass

## Constraints

- preserve the current platform foundation
- do not silently blur external and Takomi-owned run semantics
- do not regress local edge proxy behavior for existing managed previews
