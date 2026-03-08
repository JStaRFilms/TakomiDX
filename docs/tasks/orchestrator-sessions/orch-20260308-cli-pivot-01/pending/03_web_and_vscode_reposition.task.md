# Task 03: Mission Control and VS Code Reposition Around Attached and Managed Workspaces

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Keep UI changes aligned with the control-plane pivot |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Keep Mission Control changes clean and App Router-safe |

## Objective

Reposition Mission Control and the VS Code companion so they represent attached and managed workspaces as peer concepts while making it obvious which runs Takomi owns and which are only being tracked.

## Priority

P1

## Scope

Included:

- update Mission Control list and detail surfaces to represent attached and managed workspaces
- surface run ownership, tool family, cwd, pid, preview state, and log availability where useful
- update VS Code companion tree items and actions to reflect the new tracked-run model
- keep the web app framed as a secondary review and observability surface, not the primary launcher

Excluded:

- a full Mission Control redesign
- a desktop-shell or chat-shell implementation
- broad IDE support beyond the existing VS Code extension

## Current State Analysis

### Completed

- Mission Control already lists workspaces and links to preview, logs, trace, validation, approvals, and detail views.
- VS Code companion already exposes workspace-based actions using `agentd` editor payloads.
- Both surfaces already rely on shared contracts and server-built read models.

### Gap To Close

- Current copy and data presentation assume Takomi-managed workspaces are the only real workflow.
- There is no ownership-aware UI distinction between Takomi-owned runs and externally attached sessions.
- Current launch language still centers Mission Control as the control surface.

## Requirements

### Functional Requirements

- **[REQ-001]** Mission Control must show attached and managed workspaces without implying one is invalid or second-class.
- **[REQ-002]** UI must clearly show whether a run is owned by Takomi or externally attached.
- **[REQ-003]** Stop and logs affordances must respect ownership and capability.
- **[REQ-004]** VS Code companion must expose tracked attached sessions with aligned open/reveal actions.
- **[REQ-005]** Mission Control copy must stop presenting itself as the primary launcher.

### Technical Requirements

- **[TECH-001]** Reuse `agentd` read models rather than duplicating ownership logic in the UI.
- **[TECH-002]** Maintain compatibility for current workspace detail routes and commands.
- **[TECH-003]** Distinguish unavailable actions from broken actions in both Mission Control and VS Code.

## Implementation Plan

### Phase 1: Read-model integration

- [ ] Identify the new fields needed from Task 02 in Mission Control and VS Code payloads.
- [ ] Update data loaders and tree-model mapping accordingly.

### Phase 2: Mission Control UX updates

- [ ] Update overview and detail surfaces to distinguish attached vs managed workspaces.
- [ ] Surface run ownership and capability state in the UI.
- [ ] Adjust copy so the web app reads as observability/review, not the primary launcher.

### Phase 3: VS Code companion updates

- [ ] Update workspace tree labels and descriptions.
- [ ] Ensure commands only offer valid actions for the current run type.
- [ ] Keep preview, logs, trace, and repo/worktree actions coherent for attached sessions.

### Phase 4: Verification

- [ ] Verify attached-workspace payloads render without breaking existing managed ones.
- [ ] Verify invalid actions are disabled or clearly messaged.

## Files To Inspect First

- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/mission-control/app/page.tsx`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/mission-control/src/features/workspaces/data/workspace-detail-data.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/mission-control/src/features/workspaces/components`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/vscode-companion/src/extension.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/vscode-companion/src/tree.ts`
- `C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/modules/editor-companion.ts`

## Definition of Done

- Mission Control renders attached and managed workspaces as peers
- UI distinguishes owned vs external runs and respects action capability
- VS Code companion exposes the new tracked-run model without regressing existing flows
- product copy across these surfaces matches the CLI-first direction

## Verification Steps

- run `pnpm --filter mission-control typecheck`
- run `pnpm --filter mission-control test`
- run `pnpm --filter takomi-vscode-companion typecheck`
- run `pnpm --filter takomi-vscode-companion test`
- manually validate one managed and one attached workspace in both surfaces

## Constraints

- avoid a broad redesign that hides the real implementation work
- keep the UI honest about action availability
- preserve current routes and deep-link patterns unless there is a clear reason to change them
