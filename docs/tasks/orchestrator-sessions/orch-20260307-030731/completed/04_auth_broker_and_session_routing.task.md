# Task 04: Auth Broker and Session Routing

## Completion

- Status: Complete
- Completed At: `2026-03-07T11:28:01.3265905+01:00`
- Notes:
  - Added shared auth contracts for browser callback sessions, device flows, signed state, secure handoff, and human-readable failure reporting.
  - Implemented an `agentd` auth broker with durable session/event persistence, stable broker callback URLs, provider callback validation, secure workspace forwarding, and redemption.
  - Wired auth session, callback, redemption, and device-flow routes into `agentd` without coupling the broker to random runtime ports.
  - Added tests covering successful callback handoff, expired state, invalid state, provider failure, and device-flow status transitions.

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

- [x] Define auth session schema and statuses.
- [x] Define signed state payload that binds callback to workspace ID.
- [x] Define auth error model for human-readable UI reporting.

### Phase 2: Broker surface

- [x] Implement stable callback routes under the broker hostname.
- [x] Validate provider return state and nonce.
- [x] Forward the callback result to the target workspace securely.

### Phase 3: Device flow support

- [x] Add a tool-auth pathway that avoids browser callbacks where appropriate.
- [x] Model device flow status for workspace cards and notifications.

### Phase 4: Failure and observability hooks

- [x] Surface redirect mismatch and expired-state failures clearly.
- [x] Emit structured auth lifecycle events.
- [x] Add tests for successful callback, expired state, invalid state, and provider failure.

## Definition of Done

- auth callbacks no longer depend on random runtime ports
- workspace-specific auth state is safe and observable
- UI has enough data to explain auth failures clearly

## Constraints

- do not leak tokens into logs
- do not overfit to one provider
- keep broker generic and workspace-centric
