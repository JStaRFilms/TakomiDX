# Task 07: Browser Sidecar and Validation Bundles

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Workflow alignment |
| `webapp-testing` | `C:/Users/johno/.agents/skills/webapp-testing/SKILL.md` | Browser verification patterns |
| `avoid-feature-creep` | `C:/Users/johno/.agents/skills/avoid-feature-creep/SKILL.md` | Keep validation outputs focused |

## Objective

Give each workspace a browser-aware validation loop and generate review bundles that make agent output runnable and reviewable instead of opaque.

## Dependencies

- Task 03 complete
- Task 05 complete
- Task 06 complete

## Implementation Plan

### Phase 1: Sidecar interface

- [x] Define the sidecar contract and lifecycle.
- [x] Attach it to the workspace preview hostname.
- [x] Capture screenshot, console, network, and selector-level checks.

### Phase 2: Validation pipeline

- [x] Define validation checklist inputs and outputs.
- [x] Run browser validation against a workspace preview.
- [x] Record validation state and major failures.

### Phase 3: Review bundle generation

- [x] Build a review bundle format with preview URL, test summary, diagnostics, and artifact links.
- [x] Attach validation bundles to workspace detail views.
- [x] Make validation results actionable, not purely informational.

### Phase 4: Tests and failure modes

- [x] Test sidecar failure, preview unavailability, and console-error reporting.
- [x] Test that validation failures block false "completed" status.

## Definition of Done

- workspace validation includes browser-aware evidence
- review bundle is consumable by a human without extra setup
- agent completion cannot skip validation silently

## Constraints

- keep initial validation deterministic and small
- do not turn this into a full QA platform
- surface enough evidence to support trust, not noise
