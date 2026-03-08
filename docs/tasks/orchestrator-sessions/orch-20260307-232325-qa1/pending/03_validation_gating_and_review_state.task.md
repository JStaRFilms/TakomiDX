# Task 03: Validation Gating, Retry Behavior, and Review Bundle State Consistency

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
| `webapp-testing` | `C:/Users/johno/.agents/skills/webapp-testing/SKILL.md` | Browser-backed validation verification |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Mission Control action/state correctness |

## Objective

Make validation actions respect runtime readiness, recover cleanly after failure, and present review bundle state consistently across failed and successful workspaces.

## Priority

P1

## Scope

Included:

- prevent validation from firing when runtime is absent or not ready
- make validation failure messaging actionable and dismiss stale failed state after later success
- verify restart/retry semantics around validation and runtime state
- ensure review bundle cards appear consistently for both success and failure states
- fix the `Unexpected end of JSON input` failure path when validation responses are incomplete

Excluded:

- generic agent orchestration semantics outside validation/review flow

## Evidence

- PDF page 3: validation before runtime produces a persistent bad state
- PDF page 22: successful validation still leaves failed pill and restart action visible
- PDF page 22: failed workspace shows review bundle while healthy workspace does not
- PDF page 22: later validation attempt returns `fetch failed` and `Unexpected end of JSON input`

## Requirements

### Functional Requirements

- **[REQ-001]** Validation must be disabled or blocked with a clear explanation until the runtime is ready.
- **[REQ-002]** A later successful validation must clear stale failed UI from prior attempts.
- **[REQ-003]** Retry or restart actions shown after validation/runtime failure must perform a real, visible action or be hidden.
- **[REQ-004]** Review bundle UI must be consistent for successful and failed validation states.

### Technical Requirements

- **[TECH-001]** Validation action preconditions should derive from runtime readiness, not optimistic button availability.
- **[TECH-002]** Validation response parsing must tolerate empty or malformed backend responses without crashing UI state.
- **[TECH-003]** Add tests for failed-then-successful validation reconciliation.

## Implementation Plan

### Phase 1: Trace Validation State

- [ ] Trace validation button enablement conditions.
- [ ] Trace how validation result, runtime result, and restart controls are derived in the UI.
- [ ] Reproduce the stale failed state after later success.

### Phase 2: Fix Gating and Recovery

- [ ] Gate validation behind runtime readiness.
- [ ] Ensure failed state is replaced by later success rather than lingering.
- [ ] Ensure restart/retry controls are only shown when they are valid and wired.

### Phase 3: Review Bundle Consistency

- [ ] Make successful validation surfaces show the appropriate bundle/review summary.
- [ ] Handle malformed or empty validation payloads explicitly.

### Phase 4: Verification

- [ ] Verify pre-runtime validation is blocked cleanly.
- [ ] Verify successful rerun clears failure remnants.
- [ ] Verify review bundle presentation is coherent for both pass and fail cases.

## Files To Inspect First

- `apps/mission-control/src/features/workspaces/components/workspace-operator-panel.tsx`
- `apps/mission-control/src/features/workspaces/components/workspace-detail-header.tsx`
- `apps/mission-control/src/features/workspaces/data/workspace-detail-data.ts`
- `services/agentd/src/modules/validation-*`
- `services/agentd/src/server.ts`

## Definition of Done

- validation cannot be launched in obviously invalid runtime states
- stale failed validation UI clears after successful rerun
- restart/retry controls are truthful
- review bundle rendering is consistent and robust

## Constraints

- do not hide real validation failures
- prefer explicit precondition messaging over silent disablement when possible
