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

Implement the workspace lifecycle so TakomiUX can create, persist, restore, archive, and delete durable workspace capsules backed by git worktrees and local metadata.

## Dependencies

- Task 01 complete

## Implementation Plan

### Phase 1: Domain model

- [ ] Define workspace schema and status enum.
- [ ] Define run-independent workspace metadata format.
- [ ] Define artifact directory layout for logs, traces, review bundles, and browser outputs.

### Phase 2: Persistence layer

- [ ] Implement local metadata store using the chosen foundation stack.
- [ ] Add CRUD operations for workspaces.
- [ ] Add restore-on-start behavior for persisted workspaces.

### Phase 3: Git worktree integration

- [ ] Implement worktree creation from a chosen base branch.
- [ ] Apply branch naming conventions from the spec.
- [ ] Implement cleanup and archival semantics that do not corrupt the main repo.

### Phase 4: Service surface

- [ ] Expose workspace lifecycle endpoints or commands through `agentd`.
- [ ] Emit structured workspace events for UI consumption.
- [ ] Add tests for create, restore, archive, and delete flows.

## Definition of Done

- user or caller can create a workspace reliably
- worktree is provisioned correctly
- metadata survives daemon restart
- archive and delete flows are explicit and safe

## Constraints

- destructive git operations require explicit safeguards
- status model must remain small and meaningful
- do not mix runtime boot logic into lifecycle code
