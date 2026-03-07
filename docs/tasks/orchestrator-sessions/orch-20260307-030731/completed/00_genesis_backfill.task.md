# Task 00: Genesis Backfill for Product Docs and Standards

**Current Status:** Completed. Genesis artifacts are now the binding baseline for downstream implementation.

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-genesis.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Core workflow protocol |
| `spawn-task` | `C:/Users/johno/.agents/skills/spawn-task/SKILL.md` | Task-quality discipline |
| `avoid-feature-creep` | `C:/Users/johno/.agents/skills/avoid-feature-creep/SKILL.md` | Prevent requirements bloat while backfilling |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Real coding guidelines template and verification baseline |
| `sync-docs` | `C:/Users/johno/.agents/skills/sync-docs/SKILL.md` | Align new docs with the existing platform spec |

## Objective

Backfill the missing Genesis artifacts so TakomiDX has real project requirements, coding standards, issue breakdown, builder guidance, and verification setup before the implementation plan continues.

## Why This Exists

The project is already past the earliest planning step, but the normal Genesis outputs are missing or stubbed. Right now:

- `docs/Project_Requirements.md` is only a placeholder
- `docs/Coding_Guidelines.md` is only a placeholder
- `docs/Builder_Prompt.md` is only a placeholder

That means downstream build tasks do not have a proper PRD, FR inventory, acceptance criteria, issue breakdown, or standards baseline.

## Scope

Included:

- replace stub PRD with a proper Project Requirements Document
- define MUS vs Future requirements with FR IDs
- generate one issue doc per FR in `docs/issues/`
- replace placeholder coding guidelines with a real standards doc
- create verification script or verification baseline under `scripts/`
- replace placeholder builder prompt with a real build handoff
- ensure all backfilled docs reflect `TakomiDX`

Excluded:

- implementation code
- major product redefinition
- new speculative features not already grounded in the platform spec and product brief

## Inputs to Use

Use these as source-of-truth inputs:

- `docs/features/TakomiDX_Agent_Workspace_Platform_Spec.md`
- `docs/Founder_Investor_Product_Brief.md`
- `docs/tasks/orchestrator-sessions/orch-20260307-030731/master_plan.md`

## Implementation Plan

### Phase 1: Formalize product requirements

- [ ] Convert the platform spec into a proper PRD format.
- [ ] Define clear FR IDs with MUS and Future status.
- [ ] Keep the MUS scope narrow and execution-oriented.

### Phase 2: Backfill standards and verification

- [ ] Replace the placeholder coding guidelines with a real standards document.
- [ ] Add or backfill the verification script/baseline referenced by Genesis.
- [ ] Ensure the standards are compatible with the intended MVP stack.

### Phase 3: Issue decomposition

- [ ] Create `docs/issues/FR-XXX.md` files for each functional requirement.
- [ ] Give each issue a real user story, acceptance criteria, and proposed approach.
- [ ] Keep issue granularity useful for execution, not bureaucratic.

### Phase 4: Builder handoff

- [ ] Replace the placeholder `docs/Builder_Prompt.md` with a real handoff doc.
- [ ] Explicitly state MUS build order, constraints, and non-goals.
- [ ] Cross-check the handoff against the orchestrator plan.

## Definition of Done

- TakomiDX has a real PRD
- TakomiDX has real coding guidelines
- TakomiDX has FR-linked issue docs
- TakomiDX has a concrete builder handoff
- TakomiDX has a verification baseline
- downstream tasks can build against documented requirements instead of assumptions

## Constraints

- do not restart discovery from zero
- do not inflate scope just because the PRD is being backfilled
- keep the MUS set tightly aligned to the current orchestrator plan
