# Task 04: Operator Controls for Runtime Stop, Archive, Delete, and Restart Semantics

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Workflow coordination |
| `spawn-task` | `C:/Users/johno/.agents/skills/spawn-task/SKILL.md` | Self-contained task authoring |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Mission Control UX correctness |

## Objective

Make core operator actions discoverable and truthful by adding or clarifying runtime stop, archive, delete, and restart semantics in Mission Control.

## Priority

P1

## Scope

Included:

- audit whether stop runtime, archive workspace, and delete workspace actions exist end to end
- expose missing actions in the operator surface or clarify their location/state
- ensure destructive actions have explicit safeguards
- ensure restart actions are wired to real behavior and communicate outcomes clearly

Excluded:

- broad information architecture redesign
- non-MVP team/governance workflows

## Evidence

- Runbook Step 3 and Step 4 were blocked by unclear or missing UI actions.
- PDF page 3 reports `Restart agent` as apparently doing nothing.

## Requirements

### Functional Requirements

- **[REQ-001]** Operators must be able to stop a runtime from Mission Control if runtime controls are part of the supported workflow.
- **[REQ-002]** Archive and delete actions must be discoverable from the current operator experience if those flows are implemented.
- **[REQ-003]** Destructive actions must have clear confirmation and outcome feedback.
- **[REQ-004]** Restart actions must map to a real operation and visible result, or they must not be shown.

### Technical Requirements

- **[TECH-001]** Audit UI action availability against existing `agentd` endpoints before adding new backend behavior.
- **[TECH-002]** Keep action availability aligned with actual workspace state.
- **[TECH-003]** Add verification coverage for action visibility and success/failure feedback.

## Implementation Plan

### Phase 1: Capability Audit

- [ ] Audit current backend support for stop, archive, delete, and restart-related actions.
- [ ] Audit where those actions are or are not exposed in Mission Control.

### Phase 2: Surface Truthful Controls

- [ ] Add or clarify controls for supported actions.
- [ ] Remove or disable misleading actions that are not wired.
- [ ] Add confirmation and post-action feedback for destructive flows.

### Phase 3: Verification

- [ ] Verify an operator can discover stop, archive, and delete flows.
- [ ] Verify restart semantics are understandable and real.

## Files To Inspect First

- `apps/mission-control/src/features/workspaces/components/workspace-operator-panel.tsx`
- `apps/mission-control/src/features/workspaces/components/workspace-detail-header.tsx`
- `apps/mission-control/src/features/workspaces/data/workspace-detail-data.ts`
- `services/agentd/src/server.ts`
- `services/agentd/src/modules/workspace-manager.ts`
- `services/agentd/src/modules/runtime-executor.ts`

## Definition of Done

- operators can find and understand supported lifecycle actions
- restart controls are truthful
- archive/delete flows are visible and guarded if implemented
- the UI no longer implies capabilities it does not actually provide

## Constraints

- do not invent new lifecycle semantics without checking existing backend contracts
- prefer clarity and truthfulness over adding extra buttons
