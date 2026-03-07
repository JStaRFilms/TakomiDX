# Task 08: VS Code Extension and Editor Hooks

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Workflow coordination |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Shared app discipline where needed |
| `avoid-feature-creep` | `C:/Users/johno/.agents/skills/avoid-feature-creep/SKILL.md` | Keep extension MVP narrow |

## Objective

Expose workspace awareness inside VS Code so developers can inspect previews, traces, validation state, and approvals without leaving their editor.

## Dependencies

- Task 05 complete
- Task 06 complete
- Task 07 complete

## Implementation Plan

### Phase 1: Extension foundation

- [ ] Create the VS Code extension scaffold.
- [ ] Add connection layer to `agentd`.
- [ ] Define command and view model contracts.

### Phase 2: Workspace awareness

- [ ] Render active workspaces in a side panel.
- [ ] Add commands for preview, logs, and trace navigation.
- [ ] Surface pending approvals and validation results.

### Phase 3: Editor-centric refinement

- [ ] Make it easy to jump from workspace to code location or repo path.
- [ ] Ensure extension behavior matches Mission Control terminology and statuses.
- [ ] Add basic tests or verification steps for the extension UX.

## Definition of Done

- a developer can see active workspaces from inside VS Code
- preview, logs, trace, and approval actions are one click away
- extension terminology matches the core product model

## Constraints

- keep the extension thin
- do not rebuild Mission Control inside the editor
- prioritize deep linking over duplicated UI
