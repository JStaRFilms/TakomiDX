# Task 04: Auth Broker and Session Routing

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Task protocol |
| `avoid-feature-creep` | `C:/Users/johno/.agents/skills/avoid-feature-creep/SKILL.md` | Keep auth scope on routing only |

## Objective

Implement a stable auth broker so OAuth callbacks terminate on one fixed local surface and are routed to the correct workspace safely.

## Dependencies

- Task 03 complete

## Implementation Plan

### Phase 1: Auth session model

- [ ] Define auth session schema and statuses.
- [ ] Define signed state payload that binds callback to workspace ID.
- [ ] Define auth error model for human-readable UI reporting.

### Phase 2: Broker surface

- [ ] Implement stable callback routes under the broker hostname.
- [ ] Validate provider return state and nonce.
- [ ] Forward the callback result to the target workspace securely.

### Phase 3: Device flow support

- [ ] Add a tool-auth pathway that avoids browser callbacks where appropriate.
- [ ] Model device flow status for workspace cards and notifications.

### Phase 4: Failure and observability hooks

- [ ] Surface redirect mismatch and expired-state failures clearly.
- [ ] Emit structured auth lifecycle events.
- [ ] Add tests for successful callback, expired state, invalid state, and provider failure.

## Definition of Done

- auth callbacks no longer depend on random runtime ports
- workspace-specific auth state is safe and observable
- UI has enough data to explain auth failures clearly

## Constraints

- do not leak tokens into logs
- do not overfit to one provider
- keep broker generic and workspace-centric
