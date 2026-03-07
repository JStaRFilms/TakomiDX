# Task 01: Foundation and Repo Scaffold

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/mode-architect.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Orchestration conventions |
| `spawn-task` | `C:/Users/johno/.agents/skills/spawn-task/SKILL.md` | Self-contained execution discipline |
| `avoid-feature-creep` | `C:/Users/johno/.agents/skills/avoid-feature-creep/SKILL.md` | Keep MVP boundaries clean |
| `monorepo-management` | `C:/Users/johno/.agents/skills/monorepo-management/SKILL.md` | Repo structure and package boundaries |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Web app architecture standards |

## Objective

Establish the implementation foundation for TakomiDX so all downstream tasks have stable structure, shared contracts, and a clear build target.

## Scope

Included:

- choose repo layout
- establish app and package boundaries
- define MVP stack decisions
- scaffold Mission Control web shell
- scaffold `agentd` service shell
- define shared types/contracts package
- define environment variable and local data conventions
- establish lint, format, test, and dev scripts

Excluded:

- workspace logic
- proxy logic
- auth broker logic
- deep UI implementation
- full observability

## Implementation Plan

### Phase 1: Finalize MVP stack

- [x] Confirm Mission Control is web-first for MVP.
- [x] Confirm container runtime is the default isolation backend.
- [x] Confirm VS Code is the only editor integration target for MVP.
- [x] Document explicit non-goals in implementation docs.

### Phase 2: Create repo structure

- [x] Create top-level app/service/package directories.
- [x] Create a shared package for contracts, schemas, and event types.
- [x] Define naming conventions for workspaces, runs, routes, and artifacts.
- [x] Establish a local data directory strategy for runtime metadata.

### Phase 3: Scaffold app shells

- [x] Create a minimal Mission Control app shell with routing and layout.
- [x] Create a minimal `agentd` service shell with health endpoint and config loading.
- [x] Create shared config loading and validation strategy.
- [x] Add placeholder modules for future components without implementing feature logic.

### Phase 4: Tooling and quality gates

- [x] Set up formatting and linting.
- [x] Set up test runners for both web and service layers.
- [x] Add root-level scripts for bootstrap, dev, build, and test.
- [x] Ensure the scaffold can be installed and run locally without ambiguity.

## Definition of Done

- repo structure is locked
- root scripts are usable
- both main execution surfaces have runnable shells
- shared contracts package exists
- downstream tasks can build against stable locations and names

## Constraints

- do not add premature microVM or remote-mode implementation
- do not overdesign package boundaries
- optimize for downstream clarity, not maximal flexibility
