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

- [x] Verify workspace creation flow.
- [x] Verify runtime boot and preview routing.
- [x] Verify auth broker behavior.
- [x] Verify Mission Control state transitions.
- [x] Verify validation bundle generation.
- [x] Verify VS Code extension deep links.

### Phase 2: Review and fix

- [x] Run a focused code review on the integrated changes.
- [x] Fix P0 and P1 issues immediately.
- [x] Resolve any structural defects that would block the MVP story.

### Phase 3: Documentation sync

- [x] Update or add docs for implemented subsystems.
- [x] Ensure docs match actual file structure and behavior.
- [x] Add a readiness summary for future execution.

## Definition of Done

- main user journeys are verified
- major defects are fixed or explicitly documented
- implementation docs reflect reality
- the orchestrator session has a clear status summary

## Constraints

- no scope creep
- findings must be high confidence
- documentation must describe what exists, not what is imagined

## Execution Summary

### Verified Journeys

- Mission Control production build starts cleanly and loads live `agentd` workspace data without silently falling back to samples.
- Workspace creation was exercised through `POST /api/workspaces`, then archived and deleted cleanly through `agentd`.
- Runtime health refresh and runtime log retrieval were verified through Mission Control routes against a live container-backed workspace.
- Auth broker session creation now issues reachable local preview URLs when a runtime fallback is available.
- Validation bundle generation now targets the reachable runtime preview URL and produces real diagnostics instead of generic preview-unavailable blocks.
- VS Code companion payloads now expose the same reachable preview URL used by Mission Control and auth handoffs.

### Fixes Applied During Review

- Mission Control sample workspace/detail fallback is now opt-in via `TAKOMI_ENABLE_SAMPLE_DATA=true` instead of silently masking backend failures.
- Mission Control production output was hardened so the built server no longer crashes on missing `zod` chunks.
- `agentd` preview consumers now prefer `manualFallbackUrl` for live local opens, validation capture, and auth handoff redirects.
- The Python browser sidecar now tolerates Playwright request-failure payload shape differences and normalizes console levels to the contract enum.

### Residual Risks

- The stable `.takomi.localhost` route is still a persisted identity, not a working local edge attachment. Task 10 remains required to make the hostname itself reachable on this machine.
- The latest validation run for `ws_d7x53gt32c` now executes correctly but fails on a real third-party font network request from the previewed app. That is workspace-app behavior, not a Takomi control-plane failure.
- `python scripts/vibe-verify.py --quick` still skips its checks in this repo, so it is not a meaningful release gate yet.

### Readiness Summary

- Control plane: ready for local review with live workspaces, auth sessions, validation bundles, and editor deep links.
- Mission Control: ready for supervised local use against `agentd`, including backend-failure visibility.
- Edge routing: not fully ready until the local edge proxy task lands.
