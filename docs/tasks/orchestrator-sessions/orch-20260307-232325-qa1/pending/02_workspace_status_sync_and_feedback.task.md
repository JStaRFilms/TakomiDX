# Task 02: Workspace Status Synchronization and Operator Feedback Cleanup

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
| `spawn-task` | `C:/Users/johno/.agents/skills/spawn-task/SKILL.md` | Self-contained bug-fix prompt |
| `webapp-testing` | `C:/Users/johno/.agents/skills/webapp-testing/SKILL.md` | Verify real UI transitions |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Keep Mission Control state derivation coherent |

## Objective

Remove stale banners, duplicate booting pills, and runtime-state desynchronization so Mission Control reflects actual workspace and runtime state without confusing the operator.

## Priority

P1

## Scope

Included:

- fix the sticky create-workspace success banner
- eliminate duplicate runtime state pills in the workspace header
- reconcile UI status transitions with real runtime state so running containers do not keep showing failed or booting
- review whether log and health polling cadence is causing visible UI churn

Excluded:

- deep validation-state cleanup handled in Task 03
- archive/delete action design handled in Task 04

## Evidence

- PDF page 1: create banner sticks and duplicate booting pills appear
- PDF page 21: containers are actually running but pills remain failed or oscillate

## Requirements

### Functional Requirements

- **[REQ-001]** Workspace creation success feedback must settle automatically after the grid refresh completes.
- **[REQ-002]** A workspace header must show one authoritative runtime status indicator, not duplicates.
- **[REQ-003]** Runtime state shown in the UI must converge on the real backend state and not oscillate between failed and running when the runtime is healthy.
- **[REQ-004]** Frequent refreshes must not make the operator feel like the UI is thrashing.

### Technical Requirements

- **[TECH-001]** Review any duplicate state sources feeding the workspace header.
- **[TECH-002]** Review client/server polling interactions for race conditions or stale merge logic.
- **[TECH-003]** Add focused tests for create-workspace feedback completion and runtime state derivation.

## Implementation Plan

### Phase 1: Trace State Sources

- [ ] Trace where the create banner lifecycle begins and ends.
- [ ] Trace all contributors to runtime pills in workspace detail.
- [ ] Identify any competing sources of status truth.

### Phase 2: Fix UI State Machine

- [ ] Make creation feedback resolve once refresh finishes or fails.
- [ ] Collapse duplicate runtime indicators to one source of truth.
- [ ] Ensure successful runtime state overrides stale failed or booting markers correctly.

### Phase 3: Tune Refresh UX

- [ ] Review polling cadence and state reconciliation for visible churn.
- [ ] Reduce gratuitous UI flicker without hiding genuine state changes.

### Phase 4: Verification

- [ ] Reproduce the original flows from the PDF.
- [ ] Verify banner dismissal, single-pill behavior, and clean state transition from booting to running.

## Files To Inspect First

- `apps/mission-control/src/features/workspaces/components/workspace-create-form.tsx`
- `apps/mission-control/src/features/workspaces/components/workspace-detail-header.tsx`
- `apps/mission-control/src/features/workspaces/components/workspace-operator-panel.tsx`
- `apps/mission-control/src/features/workspaces/data/workspace-detail-data.ts`
- `apps/mission-control/src/features/workspaces/data/workspace-list-data.ts`

## Definition of Done

- workspace creation feedback clears correctly
- runtime header no longer shows duplicate pills
- healthy runtimes settle to a stable running state in the UI
- refresh behavior feels controlled rather than glitchy

## Constraints

- prefer one state source of truth over UI patchwork
- do not fake smoothness by suppressing legitimate failure state
