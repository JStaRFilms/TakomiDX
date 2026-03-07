# TakomiDX Manual Test Runbook

This runbook is for operator-led app testing, not unit testing.

Use the user-flow order, not raw task order. It matches how bugs actually show up, and each section maps back to the task and FR coverage it validates.

## Known Risk Before Testing

- [x] Confirm the preview-host truth first.

Docs are now aligned: `*.takomi.localhost` is the primary local preview path when the Takomi edge listener is healthy, and the fallback runtime URL is only the degraded path.

- [README.md](/C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/README.md)
- [FR-002.md](/C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/issues/FR-002.md)
- [TakomiDX_Agent_Workspace_Platform_Spec.md](/C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/features/TakomiDX_Agent_Workspace_Platform_Spec.md)
- [10_local_edge_proxy_for_preview_hosts.task.md](/C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/tasks/orchestrator-sessions/orch-20260307-030731/completed/10_local_edge_proxy_for_preview_hosts.task.md)

## Test Checklist

### 1. Base Surfaces

- [ ] Start the system and confirm the base surfaces load.
- [ ] Open Mission Control at `http://127.0.0.1:3000`.
- [ ] Confirm it is using live `agentd` data, not sample or fake data.

Covers: Task 01, Task 05, Task 09, FR-003

### 2. Workspace Creation

- [ ] Create one new workspace from the UI.
- [ ] Use a real task name.
- [ ] Select a base branch if the UI exposes it.
- [ ] Confirm the workspace appears immediately in the grid.
- [ ] Confirm the workspace detail view opens correctly.
- [ ] Confirm the workspace has stable identity and no duplicate card appears.

Expected:
- no silent failure
- no duplicate card
- no broken detail route

Covers: Task 02, FR-001, FR-003

### 3. Workspace Persistence

- [ ] Reload Mission Control and confirm the workspace still exists.
- [ ] If practical, stop and restart the local app stack.
- [ ] Confirm the workspace restores with the same identity and expected state.

Expected:
- workspace metadata survives restart

Covers: Task 02, FR-001

### 4. Archive and Delete Safety

- [ ] Archive the workspace.
- [ ] Confirm it disappears from active views or is clearly marked archived.
- [ ] Start delete flow.
- [ ] Confirm there is an explicit safeguard or confirmation step.
- [ ] Confirm delete does not feel accidental or ambiguous.

Expected:
- no accidental destructive action
- no signs of base repo corruption

Covers: Task 02, FR-001

### 5. Parallel Runtime Boot

- [ ] Create two workspaces.
- [ ] Start runtimes for both.
- [ ] Watch statuses during boot.
- [ ] Confirm both runtimes boot without port collision.
- [ ] Confirm each workspace gets its own preview target and runtime state.
- [ ] Confirm logs and status update live.

Expected:
- no port collision
- no shared-state confusion between workspaces

Covers: Task 03, Task 05, FR-002, FR-003

### 6. Preview Routing Truth Check

- [ ] For each running workspace, open `http://<slug>.takomi.localhost/`.
- [ ] Also open the shown fallback `127.0.0.1:<port>` URL.
- [ ] Confirm which one Mission Control presents as the primary preview.
- [ ] Confirm the custom host works if the edge proxy is actually healthy.
- [ ] Confirm fallback is only used when the proxy is degraded or unavailable.

Expected:
- custom host should be primary if edge proxy is truly working
- fallback should be an explicit degraded path only

Covers: Task 03, Task 10, FR-002

### 7. Runtime Failure Handling

- [ ] Stop a runtime or trigger a bad boot.
- [ ] Confirm Mission Control shows degraded or failed state clearly.
- [ ] Confirm the preview stops working cleanly.
- [ ] Confirm stale routes do not keep pretending to be healthy.
- [ ] Confirm failure messaging points to the right layer when possible.

Expected:
- no false healthy state
- no stale preview confidence

Covers: Task 03, Task 05, Task 10, FR-002, FR-003

### 8. Auth Broker Flow

- [ ] If the target app has login or OAuth, launch it from the workspace preview.
- [ ] Run through the callback flow.
- [ ] Confirm the callback lands in the correct workspace context.
- [ ] Confirm invalid or mismatch states fail clearly.
- [ ] Confirm the flow does not depend on random runtime ports.

Expected:
- correct workspace-safe callback routing
- clear auth failure states

Covers: Task 04, FR-004

### 9. Workspace Detail Usability

- [ ] From the grid, verify you can see current status, last action, preview access, and validation state.
- [ ] Open detail view and confirm you do not lose orientation.
- [ ] Confirm primary actions are visible in both grid and detail contexts.
- [ ] Confirm status language is consistent and understandable.

Expected:
- no ambiguous status language
- no orientation loss between views

Covers: Task 05, FR-003

### 10. Observability and Policy Signals

- [ ] In a running workspace, look for cost visibility.
- [ ] Look for pause reason visibility.
- [ ] Look for stop reason visibility.
- [ ] Look for warning or budget signals.
- [ ] Look for repeated-failure visibility if a loop occurs.

Expected:
- these signals are structured and human-readable
- they are not buried only in raw logs

Covers: Task 06, FR-005

### 11. Validation Bundle Flow

- [ ] Run validation only after runtime health is good.
- [ ] Open the produced validation bundle.
- [ ] Confirm the bundle includes a reachable preview URL.
- [ ] Confirm it includes screenshot or browser evidence.
- [ ] Confirm it includes diagnostics and checklist results.
- [ ] Confirm failed validation blocks false completion states.

Expected:
- validation is reviewable by a human
- failure does not silently look complete

Covers: Task 07, FR-006

### 12. VS Code Companion

- [ ] Open the VS Code extension.
- [ ] Confirm it shows active workspaces from `agentd`.
- [ ] Test preview action.
- [ ] Test logs action.
- [ ] Test trace action.
- [ ] Test validation action.
- [ ] Test approvals action.
- [ ] Test reveal worktree action.
- [ ] Test reveal repo action.
- [ ] Confirm the extension stays thin and deep-link oriented.
- [ ] Confirm terminology matches Mission Control.

Expected:
- no second control plane inside VS Code
- deep links work cleanly

Covers: Task 08, FR-007

Reference:
- [VSCode_Companion.md](/C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/features/VSCode_Companion.md)

### 13. End-to-End Regression Loop

- [ ] Create workspace.
- [ ] Boot runtime.
- [ ] Open preview.
- [ ] Test auth if relevant.
- [ ] Run validation.
- [ ] Inspect logs and trace.
- [ ] Open the same workspace in VS Code.
- [ ] Archive or delete the workspace.
- [ ] Confirm the full handoff across surfaces works without breaking context.

Expected:
- no broken handoff between Mission Control, preview, validation, auth, and VS Code

Covers: Task 09, FR-001 through FR-007

## Out of Scope For This Pass

- [ ] Do not spend time on FR-008 in this pass.
- [ ] Do not spend time on FR-009 in this pass.
- [ ] Do not spend time on FR-010 in this pass.
- [ ] Do not spend time on FR-011 in this pass.

These are future-scope items in [Project_Requirements.md](/C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/Project_Requirements.md).

## Bug Reporting Format

When a bug appears, capture:

- [ ] Step number
- [ ] What you clicked
- [ ] Expected result
- [ ] Actual result
- [ ] Screenshot or log if available

Then use that report to spawn a fix task for another agent.
