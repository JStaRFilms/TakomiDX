# Task 05: Mission Control UI Shell and Workspace Experience

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-design.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Workflow coordination |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | App-router implementation standards |
| `frontend-design` | `C:/Users/johno/.agents/skills/frontend-design/SKILL.md` | High-quality control-plane UI |
| `avoid-feature-creep` | `C:/Users/johno/.agents/skills/avoid-feature-creep/SKILL.md` | Keep the MVP surface disciplined |

## Objective

Build the Mission Control user experience that makes workspaces understandable, attributable, and actionable without terminal hunting.

## Dependencies

- Task 01 complete
- Task 02 complete
- Task 03 complete

## Implementation Plan

### Phase 1: Information architecture

- [ ] Define the main routes and screen hierarchy.
- [ ] Lock card anatomy, status model, and primary actions.
- [ ] Translate the platform spec into concrete UI states and empty states.

### Phase 2: Workspace Grid

- [ ] Implement grid layout with meaningful grouping and filtering.
- [ ] Render workspace identity, status, preview, elapsed time, and cost summary.
- [ ] Add primary quick actions per card.

### Phase 3: Workspace Detail

- [ ] Implement summary, activity, logs, trace placeholder, preview, diff placeholder, and validation tabs.
- [ ] Add approval surfaces and current-action callouts.
- [ ] Make failures and next actions obvious above the fold.

### Phase 4: DX refinement

- [ ] Ensure notifications and banners always include workspace identity.
- [ ] Add skeleton states, empty states, and failure states.
- [ ] Validate that the UI feels like a control plane, not a generic admin dashboard.

## Definition of Done

- a user can see all active workspaces and know what each is doing
- a user can drill into one workspace without losing orientation
- primary actions are obvious and status semantics are consistent

## Constraints

- do not let the UI devolve into a generic CRUD dashboard
- do not ship filler screens or fake complexity
- optimize for clarity, attribution, and speed of supervision
