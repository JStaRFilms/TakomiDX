# Task 09: Integration Hardening, Review, and Documentation Sync

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/review_code.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-syncDocs.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Task protocol |
| `code-review` | `C:/Users/johno/.agents/skills/code-review/SKILL.md` | Quality gate and defect finding |
| `sync-docs` | `C:/Users/johno/.agents/skills/sync-docs/SKILL.md` | Documentation accuracy |
| `webapp-testing` | `C:/Users/johno/.agents/skills/webapp-testing/SKILL.md` | Final UI verification |

## Objective

Stabilize the integrated build, surface high-confidence issues, verify the main user journeys, and synchronize the documentation with the implemented system.

## Dependencies

- Tasks 01 through 08 complete

## Implementation Plan

### Phase 1: Integrated verification

- [ ] Verify workspace creation flow.
- [ ] Verify runtime boot and preview routing.
- [ ] Verify auth broker behavior.
- [ ] Verify Mission Control state transitions.
- [ ] Verify validation bundle generation.
- [ ] Verify VS Code extension deep links.

### Phase 2: Review and fix

- [ ] Run a focused code review on the integrated changes.
- [ ] Fix P0 and P1 issues immediately.
- [ ] Resolve any structural defects that would block the MVP story.

### Phase 3: Documentation sync

- [ ] Update or add docs for implemented subsystems.
- [ ] Ensure docs match actual file structure and behavior.
- [ ] Add a readiness summary for future execution.

## Definition of Done

- main user journeys are verified
- major defects are fixed or explicitly documented
- implementation docs reflect reality
- the orchestrator session has a clear status summary

## Constraints

- no scope creep
- findings must be high confidence
- documentation must describe what exists, not what is imagined
