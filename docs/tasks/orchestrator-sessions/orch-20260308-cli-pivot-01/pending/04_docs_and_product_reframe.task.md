# Task 04: Product Docs and Platform Framing Rewrite for the CLI-First Thesis

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Keep the rewritten narrative aligned with the approved pivot |
| `spawn-task` | `C:/Users/johno/.agents/skills/spawn-task/SKILL.md` | Keep documentation outputs precise and handoff-ready |

## Objective

Rewrite the public and internal product framing so Takomi is consistently described as a CLI-first local control plane that integrates with terminals, IDEs, and agent apps, while Mission Control becomes a secondary review and observability surface.

## Priority

P1

## Scope

Included:

- rewrite `README.md`
- rewrite the relevant sections of `docs/Project_Requirements.md`
- rewrite the relevant sections of `docs/features/TakomiDX_Agent_Workspace_Platform_Spec.md`
- update `docs/features/VSCode_Companion.md` where necessary to reflect the new relationship to the core product
- document Codex compatibility through wrapper and attach workflows
- explicitly defer any Takomi-native chat shell from this milestone

Excluded:

- long-form marketing copy not needed for the repo
- pricing, go-to-market, or investor positioning work beyond what affects product framing

## Current State Analysis

### Completed

- The current docs clearly describe the Mission Control-first thesis and managed workspace model.
- The current repo structure and implementation are well documented.

### Gap To Close

- README and platform docs still present Mission Control as the primary product identity.
- The current requirements document encodes web-first assumptions that no longer match the approved direction.
- Codex and terminal-native workflows are not yet described as first-class adoption paths.

## Requirements

### Functional Requirements

- **[REQ-001]** Documentation must consistently state that Takomi is CLI-first for the next milestone.
- **[REQ-002]** Docs must describe attached and managed workspaces in a way that matches implementation intent.
- **[REQ-003]** Mission Control must be described as a secondary review and observability surface.
- **[REQ-004]** Codex compatibility must be documented through `takomi run` and `takomi attach` style flows.
- **[REQ-005]** Chat-shell work must be explicitly deferred.

### Technical Requirements

- **[TECH-001]** Do not document interfaces that Tasks 01-03 did not actually establish.
- **[TECH-002]** Keep terminology stable across README, requirements, and feature specs.
- **[TECH-003]** Preserve useful existing detail about `agentd`, routing, auth, and validation where it still applies.

## Implementation Plan

### Phase 1: Narrative alignment

- [ ] Audit the current CLI-first vs Mission Control-first contradictions across core docs.
- [ ] Define the canonical terminology for attached workspace, managed workspace, tracked run, owned run, and external run.

### Phase 2: Core doc rewrite

- [ ] Update README to present the new product thesis and primary workflows.
- [ ] Update project requirements to reflect the new milestone boundaries.
- [ ] Update platform and VS Code specs to match the new architecture narrative.

### Phase 3: Verification

- [ ] Read all revised docs together and check for contradictions.
- [ ] Make sure the docs do not overpromise a chat shell or deep Codex integration that is not actually part of the milestone.

## Files To Inspect First

- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/README.md`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/Project_Requirements.md`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/features/TakomiDX_Agent_Workspace_Platform_Spec.md`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/features/VSCode_Companion.md`

## Definition of Done

- README, requirements, and platform docs all reflect the CLI-first pivot
- docs describe Mission Control and VS Code as secondary surfaces
- docs describe Codex compatibility through wrapper/attach flows
- docs explicitly defer chat-shell work

## Verification Steps

- proofread the updated docs for terminology consistency
- verify documented command and API names match the implemented surfaces from Tasks 01-03

## Constraints

- keep claims anchored to what is actually implemented or explicitly planned in this milestone
- avoid vague “future platform” language that reintroduces the old Mission Control-first framing
