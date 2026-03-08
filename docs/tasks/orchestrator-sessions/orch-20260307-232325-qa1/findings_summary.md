# First QA Pass Findings Summary

## Source

- Operator notes and screenshots from [First test.pdf](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/issues/First%20test.pdf)
- Extracted text at [First test_extracted.txt](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/issues/First%20test_extracted.txt)
- Progress notes in [manual_test_runbook.md](C:/CreativeOS/01_Projects/Code/Personal_Stuff/2026-03-07_TakomiUX/docs/tasks/orchestrator-sessions/orch-20260307-030731/manual_test_runbook.md)

## High-Confidence Findings

### F-001: Create-workspace success banner sticks until manual refresh

- Evidence: PDF page 1
- Runbook mapping: Step 2
- Observed behavior:
  - workspace creation succeeds
  - `Created flighttrack. Refreshing workspace grid...` remains visible
  - manual refresh is required before the UI settles
- Likely area:
  - Mission Control create-workspace mutation completion and cache refresh flow

### F-002: Runtime header shows duplicate booting pills and stale boot state

- Evidence: PDF page 1 and page 21
- Runbook mapping: Step 5
- Observed behavior:
  - starting runtime can render two booting pills beside the workspace name
  - after restart, actual containers are running but UI can keep showing failed or oscillating state
- Likely area:
  - workspace detail derived runtime state
  - polling race conditions between health refresh and log refresh

### F-003: Runtime/log polling can crash `agentd`

- Evidence: PDF pages 3 through 20
- Runbook mapping: Step 5, Step 7, Step 9
- Observed behavior:
  - `agentd` throws an unhandled socket error: `Error: write ECONNABORTED`
  - after crash, Mission Control routes repeatedly fail against `127.0.0.1:4000`
  - detail, activity, and diff pages surface `fetch failed`
- Likely area:
  - runtime log streaming or socket write lifecycle in `agentd`
  - Mission Control polling strategy and error handling

### F-004: Mission Control does not degrade gracefully when `agentd` goes away

- Evidence: PDF pages 3, 20, 21
- Runbook mapping: Step 7, Step 9, Step 13
- Observed behavior:
  - workspace detail, activity, and diff routes crash with `Runtime TypeError: fetch failed`
  - app needs a manual restart to recover cleanly
- Likely area:
  - `workspace-detail-data.ts`
  - page-level error boundaries and backend-failure handling

### F-005: Validation can be triggered before runtime is ready and then leaves sticky error UI

- Evidence: PDF page 3 and page 22
- Runbook mapping: Step 11
- Observed behavior:
  - running validation before runtime start/readiness fails
  - failed state remains even after later successful validation
  - restart action appears but does not clearly recover the state
- Likely area:
  - validation action gating
  - retry state machine
  - success-state reconciliation after failed validation

### F-006: Review bundle visibility is inconsistent

- Evidence: PDF page 22
- Runbook mapping: Step 11
- Observed behavior:
  - failed workspace shows a review bundle card
  - healthy workspace can lack an equivalent card even when validation succeeded
  - another validation attempt returns `fetch failed` and `Unexpected end of JSON input`
- Likely area:
  - review bundle rendering rules
  - validation response parsing and empty-body handling

### F-007: Operator controls for stop/archive/delete/restart are missing or unclear

- Evidence: runbook notes plus PDF page 3
- Runbook mapping: Step 3, Step 4, Step 7
- Observed behavior:
  - no obvious stop action in the app
  - archive/delete flows are not discoverable from current operator usage
  - restart action appears to be a no-op from the operator perspective
- Likely area:
  - Mission Control operator panel and action semantics

## Notes That Are Not Yet Defects

### N-001: Terminal/log area updates very frequently

- Evidence: PDF page 1
- This may be intentional polling, or it may be a symptom of the same runtime/log refresh instability behind F-002 and F-003.

### N-002: Questions about pnpm store and observability wording

- Evidence: PDF page 2
- These look like documentation or labeling clarity issues, not confirmed product defects yet.
