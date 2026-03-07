# Task 02: Workspace Lifecycle and Persistence

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Workflow discipline |
| `avoid-feature-creep` | `C:/Users/johno/.agents/skills/avoid-feature-creep/SKILL.md` | Keep lifecycle scope crisp |

## Objective

Implement the workspace lifecycle so TakomiDX can create, persist, restore, archive, and delete durable workspace capsules backed by git worktrees and local metadata.

## Dependencies

- Task 01 complete

## Completion

- Status: Complete
- Completed At: `2026-03-07T11:12:30+01:00`
- Notes:
  - Added shared workspace lifecycle contracts, metadata schemas, branch naming helpers, and structured workspace events.
  - Implemented a persisted workspace manager with git worktree provisioning, restore-on-start behavior, safe archival, explicit delete confirmation, and event logging.
  - Exposed workspace lifecycle endpoints through `agentd` and added tests covering create, restore, archive, and delete flows.

## Implementation Plan

### Phase 1: Domain model

- [x] Define workspace schema and status enum.
- [x] Define run-independent workspace metadata format.
- [x] Define artifact directory layout for logs, traces, review bundles, and browser outputs.

### Phase 2: Persistence layer

- [x] Implement local metadata store using the chosen foundation stack.
- [x] Add CRUD operations for workspaces.
- [x] Add restore-on-start behavior for persisted workspaces.

### Phase 3: Git worktree integration

- [x] Implement worktree creation from a chosen base branch.
- [x] Apply branch naming conventions from the spec.
- [x] Implement cleanup and archival semantics that do not corrupt the main repo.

### Phase 4: Service surface

- [x] Expose workspace lifecycle endpoints or commands through `agentd`.
- [x] Emit structured workspace events for UI consumption.
- [x] Add tests for create, restore, archive, and delete flows.

## Definition of Done

- user or caller can create a workspace reliably
- worktree is provisioned correctly
- metadata survives daemon restart
- archive and delete flows are explicit and safe

## Constraints

- destructive git operations require explicit safeguards
- status model must remain small and meaningful
- do not mix runtime boot logic into lifecycle code
