# Task 05: Verification, Regression Review, and Rollout Notes

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/review_code.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Keep the final review anchored to the pivot goals |
| `code-review` | `C:/Users/johno/.agents/skills/code-review/SKILL.md` | Run a proper review loop on the completed changes |
| `subagent-driven-development` | `C:/Users/johno/.agents/skills/subagent-driven-development/SKILL.md` | Useful if fixes discovered during review need to be split into isolated follow-ups |

## Objective

Verify the CLI-first pivot works across CLI, `agentd`, Mission Control, and the VS Code companion; confirm managed flows still work; and capture rollout notes and residual risks before broader agent execution continues.

## Priority

P1

## Scope

Included:

- run a cross-surface verification pass for the new CLI-first workflows
- confirm `takomi run -- <cmd>` and `takomi attach --tool codex ...` flows are covered
- confirm attached previews route through `.takomi.localhost` with fallback behavior
- confirm current managed workspace flows still work
- run a formal code-review loop and capture residual risks or follow-ups

Excluded:

- large net-new feature work discovered during review
- future chat-shell prototyping

## Current State Analysis

### Completed

- Tasks 01-04 should have established the CLI, hybrid workspace model, `agentd` attach flows, surface repositioning, and doc rewrite.

### Review Focus

- regression risk is highest where shared contracts and `agentd` read models changed
- UI surfaces may accidentally assume all runs are Takomi-owned
- preview routing may regress if attached process targets diverge from current managed runtime assumptions

## Requirements

### Functional Requirements

- **[REQ-001]** `takomi run -- <cmd>` must create a trackable run that is visible in downstream surfaces.
- **[REQ-002]** `takomi attach --tool codex ...` must create a visible attached session with correct ownership semantics.
- **[REQ-003]** Attached preview routing must work with clean fallback behavior.
- **[REQ-004]** Managed workspace flows must remain functional.
- **[REQ-005]** The final review must capture any unresolved risks or missing tests clearly.

### Technical Requirements

- **[TECH-001]** Run targeted automated checks for contracts, `agentd`, Mission Control, and VS Code companion.
- **[TECH-002]** Run the repo review workflow on the completed change set.
- **[TECH-003]** Record verification gaps honestly if environment limits block any check.

## Implementation Plan

### Phase 1: Functional verification

- [ ] Verify the CLI launch flow.
- [ ] Verify the CLI attach flow with Codex-style metadata.
- [ ] Verify preview routing and fallback behavior for an attached process target.
- [ ] Verify at least one managed workspace flow still works.

### Phase 2: Automated checks

- [ ] Run relevant typecheck, test, and build commands for touched packages.
- [ ] Fix any P0/P1 issues surfaced by normal verification before review.

### Phase 3: Review loop

- [ ] Stage the final change set.
- [ ] Run the configured code review workflow.
- [ ] Resolve P0/P1 findings or document blockers.

### Phase 4: Rollout notes

- [ ] Capture residual risks, migration notes, and suggested next steps.

## Files To Inspect First

- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/package.json`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/packages/contracts/src/index.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/mission-control`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/vscode-companion`

## Definition of Done

- the new CLI-first flows are verified across core surfaces
- managed workspace flows are confirmed not broken
- code review has been run and significant findings handled
- rollout notes and remaining risks are written down for the next phase

## Verification Steps

- run repo or package-level checks appropriate to the touched surfaces
- run the review workflow on the staged changes
- summarize what passed, what failed, and what could not be verified

## Constraints

- do not hide verification gaps
- treat regressions in managed workflows as release blockers for this pivot
- keep follow-up scope separate from the core milestone unless it blocks correctness
