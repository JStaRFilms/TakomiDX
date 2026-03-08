# Task 01: Agentd Runtime Polling Crash and Mission Control Fetch-Failure Hardening

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
| `spawn-task` | `C:/Users/johno/.agents/skills/spawn-task/SKILL.md` | Keep the task self-contained |
| `webapp-testing` | `C:/Users/johno/.agents/skills/webapp-testing/SKILL.md` | Reproduce real Mission Control behavior |
| `nextjs-standards` | `C:/Users/johno/.agents/skills/nextjs-standards/SKILL.md` | Harden Next.js route handlers and error handling |

## Objective

Fix the crash path where `agentd` dies during runtime log and health polling, and make Mission Control degrade safely instead of throwing `fetch failed` runtime errors across workspace pages.

## Priority

P0

## Scope

Included:

- reproduce the `ECONNABORTED` / `ECONNRESET` / `ECONNREFUSED` chain reported in the first QA pass
- fix the unhandled socket error inside `agentd`
- prevent polling/log refresh behavior from taking down the daemon
- harden Mission Control route handlers and data loaders against temporary `agentd` unavailability
- ensure workspace detail, activity, and diff pages show controlled backend-unavailable states rather than crashing

Excluded:

- redesigning the whole observability system
- validation UX cleanup beyond what is required to keep pages from crashing

## Current State Analysis

### Completed

- Workspace runtimes, health refresh, and log retrieval already exist.
- Mission Control proxies runtime log and health requests through its own App Router handlers.

### Observed Failure

- During normal operator usage, `agentd` throws `Error: write ECONNABORTED` and exits.
- After that, Mission Control repeatedly fails to reach `127.0.0.1:4000` and starts surfacing `Runtime TypeError: fetch failed`.
- The failure affects at least:
  - workspace detail
  - workspace activity
  - workspace diff

### Evidence

- [findings_summary.md](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/tasks/orchestrator-sessions/orch-20260307-232325-qa1/findings_summary.md)
- [First test_extracted.txt](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/issues/First%20test_extracted.txt)

## Requirements

### Functional Requirements

- **[REQ-001]** Normal runtime polling and log viewing must not crash `agentd`.
- **[REQ-002]** If `agentd` becomes unavailable, Mission Control must show a controlled backend-unavailable state instead of crashing route rendering.
- **[REQ-003]** Workspace detail, activity, and diff pages must remain navigable even when backend calls fail.
- **[REQ-004]** Recovery after restarting `agentd` must not require clearing broken frontend state manually.

### Technical Requirements

- **[TECH-001]** Handle socket write/read aborts from runtime log or health transport without uncaught process-level errors.
- **[TECH-002]** Review whether any stream, socket, child-process, or HTTP response writer is missing an `error` handler.
- **[TECH-003]** Add tests for transient connection failures and ensure the daemon stays alive.
- **[TECH-004]** Add safe JSON/fetch handling in Mission Control loaders so upstream failure becomes typed UI state, not an uncaught render exception.

## Implementation Plan

### Phase 1: Reproduction

- [ ] Reproduce the crash with two active workspaces and runtime polling enabled.
- [ ] Identify the exact `agentd` code path producing the unhandled socket error.
- [ ] Capture whether the trigger is log tailing, health refresh, proxying, or a combination.

### Phase 2: Daemon Hardening

- [ ] Fix the unhandled error path in `agentd`.
- [ ] Ensure the daemon survives aborted client connections and partial writes.
- [ ] Add or tighten structured diagnostics for the degraded path.

### Phase 3: Mission Control Hardening

- [ ] Harden the App Router API handlers that proxy to `agentd`.
- [ ] Harden page-level data loaders used by detail, activity, and diff pages.
- [ ] Replace raw `fetch failed` crashes with actionable backend-unavailable UI.

### Phase 4: Verification

- [ ] Verify two-workspace runtime polling no longer kills `agentd`.
- [ ] Verify detail, activity, and diff pages remain usable when `agentd` is restarted mid-session.
- [ ] Add automated coverage where practical.

## Files To Inspect First

- `services/agentd/src/index.ts`
- `services/agentd/src/server.ts`
- `services/agentd/src/modules/runtime-executor.ts`
- `apps/mission-control/src/app/api/workspaces/[workspaceId]/runtime/logs/route.ts`
- `apps/mission-control/src/app/api/workspaces/[workspaceId]/runtime/refresh-health/route.ts`
- `apps/mission-control/src/features/workspaces/data/workspace-detail-data.ts`
- `apps/mission-control/src/app/workspaces/[workspaceId]/activity/page.tsx`
- `apps/mission-control/src/app/workspaces/[workspaceId]/diff/page.tsx`

## Definition of Done

- `agentd` no longer crashes during normal polling/log viewing
- Mission Control does not throw `fetch failed` runtime pages for transient backend outages
- backend failures are surfaced as controlled operator-facing states
- regression coverage exists for the failure path

## Constraints

- keep the fix surgical and evidence-driven
- do not mask backend outages as success
- do not introduce a polling strategy that spams the daemon harder than before
