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

## Implementation Plan

### Phase 1: Runtime contract

- [ ] Define runtime executor interface and lifecycle states.
- [ ] Define runtime config input derived from workspace metadata.
- [ ] Define the preview registration payload shared with the UI and proxy layer.

### Phase 2: Container execution

- [ ] Implement container-backed workspace boot.
- [ ] Mount the workspace safely.
- [ ] Support per-workspace environment injection.
- [ ] Track runtime PID/container ID and health state.

### Phase 3: Developer edge routing

- [ ] Register dynamic runtime targets with the chosen proxy.
- [ ] Assign stable hostnames under `.localhost`.
- [ ] Add health-aware route status updates.
- [ ] Ensure users never need to discover internal ports manually.

### Phase 4: Failure handling

- [ ] Handle runtime boot failures cleanly.
- [ ] Handle route registration failures without losing debug context.
- [ ] Add tests for parallel workspace startup and hostname assignment.

## Definition of Done

- multiple workspaces can boot without port collision
- each workspace gets a stable hostname
- failures are surfaced as structured state, not hidden terminal noise

## Constraints

- no manual port assignment UX
- no proxy-specific logic leaked into UI
- do not start auth work in this task
