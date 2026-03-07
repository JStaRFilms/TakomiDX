# Task 10: Local Edge Proxy for Stable Preview Hosts

## Agent Setup (DO THIS FIRST)

### Workflow to Follow

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-build.md`
- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Prime Agent Context

- `C:/Users/johno/.agents/skills/takomi/workflows/vibe-primeAgent.md`

### Required Skills

| Skill | Path | Why |
|------|------|-----|
| `takomi` | `C:/Users/johno/.agents/skills/takomi/SKILL.md` | Workflow coordination and handoff discipline |
| `spawn-task` | `C:/Users/johno/.agents/skills/spawn-task/SKILL.md` | Keep the task self-contained and execution-ready |
| `webapp-testing` | `C:/Users/johno/.agents/skills/webapp-testing/SKILL.md` | Verify the real browser host-routing path |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Keep Mission Control integration clean and typed |

## Objective

Make `*.takomi.localhost` preview hosts actually work on the developer machine by adding a real local proxy process that serves those hosts, consumes route registrations, and keeps Mission Control aligned with the true edge state.

## Priority

High

## Scope

Included:

- add a machine-local edge proxy process for stable preview hosts
- connect `agentd` route registration to that live proxy process
- update route health and diagnostics so Mission Control reflects real host availability
- verify that workspace previews open via `<workspace-slug>.takomi.localhost`

Excluded:

- internet-exposed or production ingress
- TLS automation beyond what is needed for local development
- replacing container runtime execution
- broad auth-broker redesign unrelated to local host routing

## Current State Analysis

### Completed

- runtimes boot in Docker and expose host fallback URLs like `http://127.0.0.1:<port>/`
- `route-registry` persists route records and writes Caddy-style manifest files
- Mission Control surfaces preview route status, fallback URLs, and degraded-route messaging

### In Progress

- Mission Control now polls runtime health and tails logs during boot
- preview UX prefers the fallback URL while the host route is degraded

### Pending

- no local edge proxy process is actually started or managed
- `*.takomi.localhost` hostnames resolve but do not have a reverse proxy listening behind them
- route registration currently writes manifests only; it does not make the browser path live

### Blockers

- FR-002 is only partially implemented: stable human-readable preview hosts are not yet functional
- validation and manual review still rely on fallback IP/port URLs on machines without a proxy

## Dependencies

- Task 05 complete
- Task 06 complete
- Task 07 complete
- Coordinate with Task 09 so final integration review validates the real host-routed path, not only the fallback URL

## Related Context

- [FR-002](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/issues/FR-002.md)
- [route-registry.ts](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/modules/route-registry.ts)
- [runtime-executor.ts](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/modules/runtime-executor.ts)
- [server.ts](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/server.ts)
- [workspace-detail-data.ts](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/mission-control/src/features/workspaces/data/workspace-detail-data.ts)
- [workspace-detail-header.tsx](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/mission-control/src/features/workspaces/components/workspace-detail-header.tsx)
- [workspace-operator-panel.tsx](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/mission-control/src/features/workspaces/components/workspace-operator-panel.tsx)

## Requirements

### Functional Requirements

- **[REQ-001]** A booted workspace runtime must be reachable from a browser at `http://<workspace-slug>.takomi.localhost/` without manual port guessing.
- **[REQ-002]** Registering or updating a route in `agentd` must update the live local proxy, not just a manifest file.
- **[REQ-003]** When a runtime stops, fails, or changes port, the local proxy must stop routing stale traffic and must surface a clear degraded or failed state.
- **[REQ-004]** Mission Control must distinguish between:
  - route registered and live
  - route known but proxy unavailable
  - route degraded because upstream health failed
- **[REQ-005]** Browser validation and manual preview review must prefer the custom host once it is live, and only fall back to `127.0.0.1:<port>` when the proxy is unavailable.

### Technical Requirements

- **[TECH-001]** Introduce a real local edge runtime abstraction rather than hard-coding “write a Caddy file” as the only behavior.
- **[TECH-002]** The chosen local proxy must be startable and updatable from Windows development environments used by this repo.
- **[TECH-003]** Proxy lifecycle management must be deterministic:
  - detect whether the proxy is installed or available
  - start or reuse it safely
  - apply route updates idempotently
  - report actionable diagnostics when it cannot run
- **[TECH-004]** Keep route state persisted under `.takomi` so proxy recovery after restart can restore existing routes.
- **[TECH-005]** Add tests covering route registration, route updates, restore-after-restart behavior, and degraded proxy failure states.
- **[TECH-006]** Update docs so local preview-host expectations match reality on Windows and other local-dev setups.

## Implementation Plan

### Phase 1: Edge runtime design

- [ ] Decide the local proxy strategy for this repo’s MVP:
  - managed Caddy process
  - another lightweight local reverse proxy
  - or a Takomi-owned proxy process
- [ ] Create an explicit edge runtime abstraction in `agentd` so route persistence and live proxy mutation are separate responsibilities.
- [ ] Define what “proxy available,” “route live,” and “proxy degraded” mean in structured state.

### Phase 2: Live proxy management

- [ ] Add proxy lifecycle management in `agentd`:
  - start or attach to the local proxy
  - apply route changes
  - remove or disable routes cleanly
- [ ] Make route registration update the live proxy and not just JSON manifests.
- [ ] Restore routes from disk on `agentd` startup and rehydrate the live proxy process.
- [ ] Surface installation or startup failures as first-class diagnostics instead of silent degraded fallbacks.

### Phase 3: Health and Mission Control integration

- [ ] Update runtime and route health refresh flows so host-route availability is probed directly.
- [ ] Prefer the custom preview host in Mission Control once the route is truly live.
- [ ] Keep the fallback URL available, but only as a degraded-path escape hatch.
- [ ] Clarify the UI so operators can see whether failure is coming from Docker, upstream app health, or the local proxy layer.

### Phase 4: Verification and docs

- [ ] Add tests for route persistence, re-registration, health updates, and proxy failure handling.
- [ ] Verify in a browser that `http://<workspace-slug>.takomi.localhost/` serves the live preview.
- [ ] Verify validation bundles can use the custom host when the proxy is healthy.
- [ ] Update README and any relevant feature docs with proxy prerequisites, troubleshooting, and Windows notes.

## Files to Create or Modify

| File | Action | Purpose |
|------|--------|---------|
| `services/agentd/src/modules/route-registry.ts` | Modify | Separate route persistence from live proxy application |
| `services/agentd/src/server.ts` | Modify | Expose proxy-aware route and health state |
| `services/agentd/src/modules/runtime-executor.ts` | Modify | Probe and report host-route availability in coordination with runtime state |
| `services/agentd/src/modules/*.test.ts` | Modify/Create | Add coverage for proxy lifecycle and route state |
| `apps/mission-control/src/features/workspaces/data/workspace-detail-data.ts` | Modify | Prefer the custom host only when live and surface richer route states |
| `apps/mission-control/src/features/workspaces/components/workspace-detail-header.tsx` | Modify | Explain live host vs fallback host clearly |
| `apps/mission-control/src/features/workspaces/components/workspace-operator-panel.tsx` | Modify | Surface proxy state and guidance during runtime boot |
| `README.md` | Modify | Document local proxy requirements and troubleshooting |

## Definition of Done

- `*.takomi.localhost` opens the correct workspace preview locally without manual port hunting
- route registration updates the real proxy, not just a manifest file
- Mission Control accurately reports whether the host route is live, degraded, or unavailable
- fallback URLs remain available only as an explicit degraded path
- tests and docs cover the local proxy lifecycle and failure modes

## Constraints

- keep the design local-first and simple enough for Windows developer machines
- do not introduce a proxy architecture that requires external infrastructure for local preview
- do not hide proxy failures behind “running” states when the host route is still unusable
- avoid scope creep into remote hosting or production ingress

## Getting Started

1. Read [FR-002](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/issues/FR-002.md) and confirm the acceptance criteria still match the intended MVP.
2. Inspect the current route persistence path in [route-registry.ts](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/services/agentd/src/modules/route-registry.ts).
3. Trace how Mission Control currently resolves preview URLs in [workspace-detail-data.ts](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/apps/mission-control/src/features/workspaces/data/workspace-detail-data.ts).
4. Implement the proxy lifecycle before touching fallback-URL UX.
5. Verify in-browser with a real workspace preview and only close the task once the custom host answers.
