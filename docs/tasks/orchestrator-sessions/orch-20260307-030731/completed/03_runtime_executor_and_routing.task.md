# Task 03: Runtime Executor and Developer Edge Routing

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Execution structure |
| `avoid-feature-creep` | `C:/Users/johno/.agents/skills/avoid-feature-creep/SKILL.md` | Prevent runtime overreach |

## Objective

Implement isolated runtime boot plus stable preview routing so each workspace can run without port collisions and expose a human-readable hostname.

## Dependencies

- Task 01 complete
- Task 02 complete

## Completion

- Status: Complete
- Completed At: `2026-03-07T10:58:03.8256631+01:00`
- Notes:
  - Added shared runtime and preview routing contracts.
  - Implemented container-oriented runtime boot, health probing, and persisted runtime state in `agentd`.
  - Implemented proxy-agnostic route registration with Caddy manifest output and structured failure handling.
  - Added tests covering parallel startup, stable hostname assignment, runtime boot failure, and route registration failure.

## Implementation Plan

### Phase 1: Runtime contract

- [x] Define runtime executor interface and lifecycle states.
- [x] Define runtime config input derived from workspace metadata.
- [x] Define the preview registration payload shared with the UI and proxy layer.

### Phase 2: Container execution

- [x] Implement container-backed workspace boot.
- [x] Mount the workspace safely.
- [x] Support per-workspace environment injection.
- [x] Track runtime PID/container ID and health state.

### Phase 3: Developer edge routing

- [x] Register dynamic runtime targets with the chosen proxy.
- [x] Assign stable hostnames under `.localhost`.
- [x] Add health-aware route status updates.
- [x] Ensure users never need to discover internal ports manually.

### Phase 4: Failure handling

- [x] Handle runtime boot failures cleanly.
- [x] Handle route registration failures without losing debug context.
- [x] Add tests for parallel workspace startup and hostname assignment.

## Definition of Done

- multiple workspaces can boot without port collision
- each workspace gets a stable hostname
- failures are surfaced as structured state, not hidden terminal noise

## Constraints

- no manual port assignment DX
- no proxy-specific logic leaked into UI
- do not start auth work in this task
