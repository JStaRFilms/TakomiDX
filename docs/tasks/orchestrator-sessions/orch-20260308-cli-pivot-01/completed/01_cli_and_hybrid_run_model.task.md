# Task 01: CLI Package and Hybrid Attached-vs-Managed Run Model

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Align with Takomi orchestration conventions |
| `spawn-task` | `C:/Users/johno/.agents/skills/spawn-task/SKILL.md` | Keep task outputs self-contained and implementation-ready |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Keep public interface changes consistent with the existing repo standards |

## Objective

Define and implement the first `takomi` CLI surface plus the hybrid workspace model that makes attached local workflows the default while preserving existing managed workspace capabilities.

## Priority

P0

## Scope

Included:

- introduce a new CLI package or service entrypoint for `takomi`
- fix the initial command surface for `takomi run`, `takomi attach`, `takomi status`, `takomi open`, and `takomi logs`
- define and encode attached-vs-managed workspace and run metadata in shared contracts
- make ownership rules explicit for Takomi-owned child processes vs externally attached sessions
- keep the first milestone terminal-first and Codex-friendly

Excluded:

- building a Takomi-native chat shell
- replacing current managed Docker runtime flows
- broad IDE integrations beyond the existing VS Code companion

## Current State Analysis

### Completed

- `agentd` already owns workspace identity, runtime state, preview routing, auth broker, validation bundles, and observability.
- Mission Control and VS Code already consume workspace-oriented read models from `agentd`.
- Shared Zod contracts already define workspace, runtime, validation, and editor companion structures.

### Gap To Close

- There is no first-class `takomi` CLI yet.
- The current workspace model assumes Takomi-managed worktrees and container runtimes as the primary flow.
- The repo does not yet model externally attached local runs such as Codex sessions or ordinary terminal commands.

## Requirements

### Functional Requirements

- **[REQ-001]** `takomi run -- <cmd...>` must have a defined UX and data model for spawning a tracked local run.
- **[REQ-002]** `takomi attach` must support attaching an existing process or agent session with explicit metadata.
- **[REQ-003]** `takomi status`, `takomi open`, and `takomi logs` must have stable output targets and ownership semantics.
- **[REQ-004]** The shared contracts must distinguish attached vs managed workspaces and Takomi-owned vs external runs.

### Technical Requirements

- **[TECH-001]** Add the minimum new contract fields needed for workspace mode, run origin, tool family, ownership, cwd, pid, and preview hints.
- **[TECH-002]** Preserve backward compatibility for existing managed workspace consumers.
- **[TECH-003]** Do not force downstream surfaces to infer ownership from brittle heuristics.
- **[TECH-004]** Keep the CLI package small and focused on the first milestone command surface.

## Implementation Plan

### Phase 1: Command and model definition

- [ ] Decide where the `takomi` CLI lives in the monorepo and how it is invoked from workspace scripts.
- [ ] Define the user-facing semantics for `run`, `attach`, `status`, `open`, and `logs`.
- [ ] Define workspace mode and run ownership enums or equivalent fields in shared contracts.

### Phase 2: Contract and API shape

- [ ] Extend shared contracts with the hybrid workspace/run model.
- [ ] Update any server-side types or serializers that need the new fields.
- [ ] Make compatibility decisions explicit where older consumers do not yet populate the new fields.

### Phase 3: Initial CLI implementation

- [ ] Scaffold the CLI entrypoint.
- [ ] Implement argument parsing and calls into `agentd`.
- [ ] Ensure Codex-friendly metadata can be passed through `attach`.

### Phase 4: Verification

- [ ] Verify the CLI compiles and its commands resolve against the chosen interfaces.
- [ ] Verify existing managed workspace code paths still typecheck.

## Files To Inspect First

- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/package.json`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/pnpm-workspace.yaml`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/packages/contracts/src/index.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/server.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/README.md`

## Definition of Done

- the initial `takomi` CLI command surface exists in the repo
- shared contracts encode attached vs managed workspaces and owned vs external runs
- the CLI-to-`agentd` interaction path is clear enough for Task 02 to build on
- existing managed workspace paths remain intact

## Verification Steps

- run CLI package typecheck/build
- verify contract consumers still typecheck
- verify the new command help or invocation path reflects the approved five-command surface

## Constraints

- keep the first milestone focused on terminal-native workflows
- do not add chat-shell work
- do not break current managed workspace behavior in pursuit of the new attached model
