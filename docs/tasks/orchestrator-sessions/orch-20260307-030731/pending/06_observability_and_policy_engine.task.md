# Task 06: Observability and Policy Engine

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Execution alignment |
| `avoid-feature-creep` | `C:/Users/johno/.agents/skills/avoid-feature-creep/SKILL.md` | Keep trace model focused |

## Objective

Implement the core event, tracing, and policy systems that make agent runs explainable, budget-aware, and interruptible.

## Dependencies

- Task 02 complete
- Task 03 complete

## Implementation Plan

### Phase 1: Event model

- [ ] Define workspace, run, tool, auth, preview, and validation event types.
- [ ] Add structured emission points in `agentd`.
- [ ] Define stable IDs and correlation rules across services.

### Phase 2: Tracing and cost

- [ ] Wire the event model into OpenTelemetry-compatible tracing.
- [ ] Track model usage, token counts, and derived spend.
- [ ] Expose run-level summaries to Mission Control.

### Phase 3: Policy controls

- [ ] Implement budget caps and warnings.
- [ ] Implement repeated-failure loop detection.
- [ ] Implement approval-required action categories and pause behavior.

### Phase 4: Reliability tests

- [ ] Test event emission for major lifecycle transitions.
- [ ] Test budget exceed behavior.
- [ ] Test pause-on-loop behavior.

## Definition of Done

- runs emit structured, queryable events
- the system can explain what an agent did and why it paused
- policy decisions are deterministic and visible

## Constraints

- do not couple the event model to one vendor UI
- keep policy rules explicit and inspectable
- do not hide stop reasons behind generic status text
