# TakomiDX Agent Workspace Platform Spec

## Overview

TakomiDX is a local-first agent orchestration platform for multi-agent coding workflows. It provides a CLI-first control plane for managing agent execution, lifecycle, and observability across both managed task capsules and attached local projects.

The core product thesis is:

> Multi-agent coding is not a terminal problem. It is a local platform problem.

Today's operating systems treat development as a single-user, single-focus workflow. Agentic coding breaks that assumption. Multiple agents need stable identity, isolated or tracked runtime state, stable preview routing, traceability, and a control plane that lets a human supervise work without getting lost in tabs, ports, or PR noise.

TakomiDX turns a developer machine into a structured, multi-tenant local platform with the following guarantees:

- Every agent run is tracked within a workspace (Managed or Attached).
- Every workspace gets a stable identity and preview hostname.
- Every auth flow is routed via a stable local broker.
- Every run captures a structured Trace Capsule (logs, costs, tool calls).
- Every code change is verified through a high-fidelity review loop in Mission Control.

## Product Goals

### Primary goals

- Run and track many coding agents in parallel without terminal chaos.
- Provide a CLI-first workflow (`takomi run`) compatible with external tools like Codex.
- Support both **Managed** (orchestrated worktrees) and **Attached** (native CWD) workspaces.
- Make auth flows reliable across concurrent local environments.
- Give users a high-fidelity "Review Plane" (Mission Control) to validate agent output.

### Secondary goals

- Make workspaces resumable and persistent across machine restarts.
- Provide deep-link integration between CLI, Editor, and Review Plane.
- Support local, containerized, and remote execution backends under one model.
- Provide an upgrade path towards a full agent-native desktop environment.

### Non-goals

- Replacing GitHub or existing git hosting services.
- Building a full general-purpose operating system in the MVP.
- Replacing primary editors (Takomi is a companion surface).
- Providing a native chat shell in the first milestone (deferred).

## Core Product Thesis: The Run Capsule

TakomiDX is designed around the concept of a **Run Capsule** within a **Workspace**.

A Workspace is a durable container for a specific task. It can be:
- **Managed**: Takomi owns the worktree and runtime (container-based).
- **Attached**: Takomi tracks the run in an existing directory on the host.

The Run Capsule bundles:
- agent session metadata
- structured traces (tool calls, reasoning)
- runtime logs
- token usage and cost metrics
- browser-aware validation artifacts (screenshots, console logs)
- approval and review status

The user should think first about:
- which task is running
- whether it is healthy
- how much it has cost
- how to validate and review the output

## Design Principles

### 1. CLI First, UI for Review
The primary driver for starting and managing tasks is the terminal. The UI is for rich observability and review.

### 2. Managed vs. Attached Flexibility
Support both clean-slate managed worktrees and "brownfield" attachment to existing local projects.

### 3. Stable Identity Everywhere
Every workspace has a stable name, hostname, and trace ID prefix.

### 4. Human-Readable Routing
Users open `billing-fix.myapp.localhost`, not `localhost:3017`.

### 5. Verification over Generation
The goal is trusted, validated progress—not just generating more code.

### 6. Observability is a Product Feature
Tracing and cost visibility are core DX, not internal logs.

## The Mental Model

TakomiDX is a local "Control Plane" for autonomous workers.

Each workspace is a **Task**, managed via CLI:
```bash
takomi run -- "fix the landing page"
```

Each Task has a **Review Item** in Mission Control once validation is generated.

The user should be able to answer in under 5 seconds:
- What is running?
- How much has it cost?
- Is the preview healthy?
- What validation evidence do I have?

## High-Level Architecture

```mermaid
flowchart TD
    U["User / Terminal"] --> CLI["Takomi CLI"]
    CLI --> AD["agentd daemon"]
    MC["Mission Control (Review Plane)"] --> AD
    IDE["VS Code Companion"] --> AD
    
    AD --> WM["Workspace Manager"]
    AD --> RT["Runtime Executor"]
    AD --> PX["Local Edge Proxy"]
    
    WM --> GW["Managed Worktrees"]
    WM --> AT["Attached Directories"]
    
    RT --> CT["Containers (Managed)"]
    RT --> HP["Host Processes (Attached)"]
    
    AD --> OBS["Observability Pipeline"]
    OBS --> OT["OTel / Trace Storage"]
```

## Current MVP Integration Notes

- `agentd` is the current local source of truth for workspace metadata, runtime state, auth sessions, validation bundles, and editor companion payloads.
- `agentd` now owns the local edge listener for `*.takomi.localhost`, restores persisted routes on startup, and keeps route state separate from proxy lifecycle state.
- Human-readable preview hosts remain the canonical workspace identity and are now the preferred browser path whenever the local edge listener is healthy.
- Browser validation bundles, auth broker handoffs, and VS Code preview actions use the custom host by default and only drop to the runtime fallback URL when the local edge proxy is unavailable.

## Main System Components

### 1. `agentd` daemon

`agentd` is the local control-plane daemon. It is the authoritative source of truth for active workspaces and agent runs.

### Responsibilities

- Create and destroy workspaces.
- Allocate stable workspace identity.
- Launch agents.
- Coordinate runtime isolation.
- Register previews with the developer edge proxy.
- Register auth routes with the auth broker.
- Stream status events to the UI.
- Enforce budgets and policies.
- Persist session state.
- Expose a local API for Mission Control and IDE extensions.

### Suggested implementation

- Language: Go or Rust.
- Local API: HTTP + WebSocket or SSE.
- Storage: SQLite for durable local metadata.
- Process supervision: internal supervisor with restart policy.

### Core local API examples

```json
{
  "workspaceId": "ws_01HZX8Y7B7",
  "slug": "billing-fix",
  "repoPath": "C:\\Projects\\myapp",
  "branch": "agent/billing-fix",
  "runtimeType": "container",
  "previewHost": "billing-fix.myapp.localhost",
  "status": "running"
}
```

```json
{
  "runId": "run_01HZX8YJQ5",
  "workspaceId": "ws_01HZX8Y7B7",
  "agentType": "claude-code",
  "status": "awaiting_human",
  "lastTool": "npm test",
  "tokenCostUsd": 2.41,
  "stopReason": null
}
```

### 2. Workspace Manager

The Workspace Manager manages the lifecycle of **Managed** and **Attached** workspaces.

### Responsibilities
- **Managed Mode**: Create git worktrees, provision metadata, and manage the capsule lifecycle.
- **Attached Mode**: Register existing directories, track active PIDs, and map external runs to the Control Plane.
- Restore all workspace routes and metadata on `agentd` startup.
- Clean up artifacts and worktrees on archival.

### Suggested workspace layout (Managed)
```text
takomi/
  workspaces/
    ws_01HZX8Y7B7/
      meta.json
      runtime.env
      review/        # Review Plane artifacts
      traces/        # OTel spans
      logs/          # Run logs
      browser/       # Screenshots & validation
```

### Git strategy (Managed)
- Base repo remains untouched.
- Each workspace uses `git worktree`.
- Branch naming: `agent/<slug>` or `review/<slug>`.

### 3. Runtime Executor

The Runtime Executor orchestrates the execution environment.

### Supported modes
- **Container mode (Default for Managed)**: Isolated container runtime with mounted worktree.
- **Host mode (Default for Attached)**: Direct execution on the host machine with OTel tracing sidecars.
- **MicroVM mode (Planned)**: Hardware-level isolation for untrusted agents.

### Responsibilities
- Boot and supervise runtimes.
- Inject `TAKOMI_*` environment variables for tool-family awareness.
- Start and health-check the Dev Server.
- Register preview routes with the Local Edge Proxy.
- Capture agent tool output and reasoning traces.
- Report process/container health to Mission Control.

### Container mode implementation

- Base image per stack or devcontainer spec
- Mount worktree into container
- Shared cache volumes for package managers
- Dedicated network per workspace

### MicroVM mode implementation

MicroVM mode is the later-stage answer for stronger isolation and durable "agent desktops".

- Firecracker-backed or equivalent microVM runtime
- Per-workspace lightweight VM
- Faster boot than traditional VM
- Better boundary for risky tool usage

### 4. Developer Edge Proxy

This component solves the localhost problem by providing stable, human-readable preview identity.

### Responsibilities

- route stable hostnames to dynamic internal ports
- optionally terminate local TLS
- expose preview health
- maintain routing table

### Example routing scheme

- `billing-fix.myapp.localhost`
- `test-migration.myapp.localhost`
- `auth.localhost`

### Why `.localhost`

`.localhost` is appropriate for local loopback naming and removes the need for users to memorize ports.

### Suggested implementation

- Caddy or Traefik
- Dynamic configuration generated by `agentd`
- One stable host port: 80 or 443 locally

### Example route record

```json
{
  "workspaceId": "ws_01HZX8Y7B7",
  "host": "billing-fix.myapp.localhost",
  "target": "127.0.0.1:45231",
  "tls": true,
  "healthPath": "/"
}
```

### 5. Auth Broker

The Auth Broker decouples app identity from runtime port assignment.

### Responsibilities

- receive all local OAuth callbacks on a stable address
- identify the target workspace
- forward or finalize auth state
- persist session mapping

### Core rule

User-facing auth callbacks should never depend on random workspace ports.

### Example callback scheme

- `https://auth.localhost/callback/github/<workspace-id>`
- `https://auth.localhost/callback/google/<workspace-id>`

### Routing model

1. Workspace initiates auth request.
2. Broker signs state containing workspace identity.
3. Provider redirects to stable broker callback.
4. Broker validates state.
5. Broker forwards session result to the correct workspace.

### Alternative flow for agent tool auth

For CLI-like agent identity where browser redirects are unnecessary:

- use OAuth device flow
- or use PAT / service account / development credentials

### Security notes

- sign and validate callback state
- bind state to workspace and nonce
- expire callback sessions quickly
- never expose raw tokens in general logs

### 6. Browser Sidecar

Agents that touch UI cannot remain blind.

The Browser Sidecar is a Playwright or CDP-backed companion service for each workspace.

### Responsibilities

- open the workspace preview
- capture screenshots
- read DOM state
- collect browser console errors
- collect network errors
- execute scripted validation steps

### Why this matters

Without browser context, an agent can change code that looks correct in source but fails visually or at runtime.

### Example sidecar outputs

- screenshot set
- console log summary
- failed request list
- DOM selector existence checks
- accessibility audit summary

### 7. Observability Pipeline

Observability is a first-class feature.

### Required events

- prompt issued
- model selected
- tool call started
- tool call completed
- token count
- cost
- stop reason
- human intervention
- filesystem diff generated
- preview health failure
- browser console error

### Recommended tracing model

- OpenTelemetry for canonical event structure
- Langfuse, Jaeger, or equivalent viewer for analysis
- local append-only event journal for replay

### Event categories

| Category | Examples |
|----------|----------|
| Agent reasoning | prompt, response, plan update |
| Tool execution | shell command, file edit, browser action |
| Runtime health | server booted, server crashed, port registered |
| Review | preview opened, checklist item passed, human approved |
| Cost | tokens, model spend, budget warnings |

### Sample event

```json
{
  "timestamp": "2026-03-07T12:00:00Z",
  "workspaceId": "ws_01HZX8Y7B7",
  "runId": "run_01HZX8YJQ5",
  "type": "tool.completed",
  "tool": "shell",
  "name": "npm test",
  "durationMs": 4312,
  "exitCode": 1,
  "summary": "2 tests failed"
}
```

### 8. Policy Manager

Agents are non-deterministic. Policy must be part of the runtime, not an afterthought.

### Responsibilities

- token spend caps
- time limits
- concurrency limits
- filesystem restrictions
- dangerous command approval gates
- auto-pause loops

### Example policies

- Max 5 concurrent active workspaces
- Max $10 per run unless user approves extension
- Require approval for `rm -rf`, database resets, and credential changes
- Auto-pause after 3 repeated identical failing tool calls

### 9. Mission Control UI

Mission Control is the central product surface. It should be the place the user opens first and keeps open.

### Core views

- Workspace Grid
- Workspace Detail
- Review Queue
- Trace Explorer
- Settings / Policies

### Workspace Grid contents

Each card should show:

- workspace name
- repo name
- agent type
- current status
- elapsed time
- last action
- preview link
- token cost
- health signal

### Status states

- queued
- booting
- running
- awaiting_human
- validating
- failed
- completed
- archived

### Suggested card layout

```text
+------------------------------------------------------+
| billing-fix                              RUNNING     |
| repo: myapp  branch: agent/billing-fix               |
| agent: Claude Code                                   |
| last action: running Playwright smoke test           |
| preview: billing-fix.myapp.localhost                 |
| cost: $2.41   elapsed: 18m   trace health: healthy   |
| [Open Preview] [Open Code] [Open Logs] [Pause]       |
+------------------------------------------------------+
```

### Workspace Detail view

This page should have tabs:

- Summary
- Activity
- Logs
- Trace
- Preview
- Diff
- Validation
- Settings

### 10. IDE Extension

The IDE extension should not replace Mission Control. It should make workspace context available where code review and steering already happen.

### Main extension features

- show active workspace in a side panel
- open preview for current workspace
- show trace link
- show pending approvals
- compare agent changes against current branch
- attach inline comments or steering notes back to the run

### Primary editors to target

- VS Code first
- Cursor and Windsurf later if supported
- JetBrains only after the model stabilizes

## End-to-End User Flows

### Flow 1: Start an agent from the terminal and review it in Mission Control

```mermaid
sequenceDiagram
    participant U as User / Terminal
    participant CLI as Takomi CLI
    participant AD as agentd
    participant MC as Mission Control
    participant RT as Runtime / Tracking

    U->>CLI: takomi run -- "claude solve..."
    CLI->>AD: start or register owned run
    AD->>RT: execute or track run context
    AD-->>MC: update review plane (observer)
    AD-->>MC: stream traces & logs
```

### DX example

The approved terminal entrypoints in this milestone are `takomi run` and `takomi attach`.

The current repo centers the pivot on those entrypoints while `agentd`, Mission Control, and the VS Code companion share the same attached-vs-managed workspace model.

While the run is active, Mission Control displays the workspace as a reviewable tracked item. The user can move between terminal, Mission Control, and VS Code without losing workspace identity.

### Flow 2: OAuth login inside a workspace

```mermaid
sequenceDiagram
    participant App as Workspace App
    participant Broker as Auth Broker
    participant Provider as OAuth Provider
    participant UI as Browser

    App->>Broker: request signed auth state
    Broker-->>App: state token with workspace ID
    App->>Provider: redirect to provider
    Provider->>UI: redirect to auth.localhost callback
    UI->>Broker: callback with code and state
    Broker->>Broker: validate state and map workspace
    Broker->>App: forward auth result
    App-->>UI: session established
```

### DX example

The workspace card shows a pill:

- `Auth required`

Clicking it opens a guided action drawer:

- Provider: GitHub
- Callback target: `auth.localhost`
- Workspace: `billing-fix`
- State: `ready`

If the callback succeeds, the card updates:

- `Auth healthy`

If it fails, the card shows:

- `Auth failed: redirect mismatch`

The user can click `Inspect` and see the exact callback route and provider error.

### Flow 3: Agent runs, hits an issue, and requests help

### DX example

The card status changes from `running` to `awaiting_human`.

The system notification should say:

`billing-fix is waiting for approval to reset test database`

Not:

`Task complete`

The notification click should deep-link into the exact workspace detail and open the `Approvals` drawer.

The drawer should show:

- requested action
- why the agent wants it
- affected resources
- risk level
- approve once / always allow / deny

### Flow 4: Review and validate agent output

```mermaid
sequenceDiagram
    participant A as Agent
    participant V as Validation Engine
    participant MC as Mission Control
    participant U as User
    participant Git as Git Provider

    A->>V: request validation after code changes
    V->>V: run tests, browser checks, trace export
    V-->>MC: review bundle ready
    MC-->>U: review item created
    U->>MC: inspect preview, diff, traces, checklist
    U->>Git: open or approve PR
```

### Review bundle contents

- preview URL
- test summary
- browser console summary
- changed files
- trace link
- cost summary
- risk hotspots
- suggested validation checklist

### Core product rule

A workspace should not be considered complete merely because the agent stopped.

A workspace is complete when:

- validation is green or explicitly waived
- human review is recorded
- output is accepted, archived, or sent back for another iteration

## Detailed DX Specification

### Workspace Grid

### Purpose

Provide constant top-level awareness across all active workspaces.

### Sorting and grouping

- group by status by default
- sort running workspaces by recent activity
- pin current or high-priority workspaces
- filter by repo, agent type, or tag

### Color semantics

- neutral gray: queued / archived
- blue: booting / validating
- green: healthy running or completed validation
- amber: awaiting human or budget warning
- red: failed or unhealthy

### Inline quick actions

- open preview
- open editor
- open logs
- pause
- resume
- archive

### Workspace Detail

### Summary tab

Shows the key facts first:

- what the task is
- what changed
- current status
- next required action

### Activity tab

An event feed with semantic entries, not raw terminal dump.

Example feed:

- `12:02 PM` Agent created branch `agent/billing-fix`
- `12:03 PM` Dev server booted at `billing-fix.myapp.localhost`
- `12:04 PM` Browser sidecar detected 2 console errors
- `12:06 PM` Agent patched `src/auth/callback.ts`
- `12:08 PM` OAuth callback succeeded
- `12:10 PM` Validation bundle created

### Logs tab

Raw terminal output for debugging, but secondary to the activity feed.

### Trace tab

A structured trace view with:

- step tree
- duration
- cost per span
- stop reasons
- repeated failure clusters

### Diff tab

A repo-aware diff with agent summaries on each file cluster.

### Validation tab

Contains:

- checklist
- screenshots
- preview launch
- console errors
- test runs
- final approval state

### Notifications

Notifications must always answer:

- which workspace
- what happened
- what action is needed

### Good notification examples

- `checkout-redesign finished validation. Preview is ready.`
- `billing-fix needs approval for database reset.`
- `test-migration exceeded its $10 budget and is paused.`
- `auth-refactor failed to boot preview. Click to inspect runtime logs.`

### Bad notification examples

- `Task finished`
- `An agent needs input`
- `Server error`

### Error Handling DX

### Preview boot failure

If the dev server fails to boot:

- card turns red
- status becomes `failed`
- primary CTA becomes `Inspect Runtime`
- detail page opens to logs + environment summary

### Proxy registration failure

If proxy registration fails:

- show both intended hostname and internal port
- allow manual fallback open
- provide copyable diagnostics

### Auth callback mismatch

If provider rejects callback:

- surface provider error text
- show expected callback URL
- show registered workspace callback route
- suggest resolution path

### Infinite loop detection

If the same failing tool call repeats several times:

- auto-pause run
- banner: `Likely loop detected`
- show repeated command cluster
- offer `resume once`, `edit instruction`, or `terminate`

## Data Model

### Workspace

| Field | Type | Description |
|-------|------|-------------|
| id | string | durable workspace ID |
| slug | string | human-readable identifier |
| repoPath | string | source repo root |
| branch | string | branch tied to workspace |
| runtimeType | enum | local, container, microvm, remote |
| previewHost | string | stable hostname |
| status | enum | lifecycle status |
| createdAt | datetime | creation timestamp |
| archivedAt | datetime nullable | archival time |

### Agent Run

| Field | Type | Description |
|-------|------|-------------|
| id | string | run ID |
| workspaceId | string | parent workspace |
| agentType | string | provider / agent flavor |
| status | enum | run status |
| startedAt | datetime | start time |
| endedAt | datetime nullable | end time |
| tokenCostUsd | number | accumulated spend |
| stopReason | string nullable | terminal cause |

### Preview Route

| Field | Type | Description |
|-------|------|-------------|
| workspaceId | string | owning workspace |
| host | string | stable hostname |
| target | string | runtime target |
| tls | boolean | local TLS enabled |
| healthStatus | enum | healthy or unhealthy |

### Auth Session

| Field | Type | Description |
|-------|------|-------------|
| id | string | auth session ID |
| workspaceId | string | owning workspace |
| provider | string | github, google, etc |
| stateNonce | string | signed state nonce |
| status | enum | requested, callback_received, failed, completed |
| expiresAt | datetime | expiry |

### Validation Bundle

| Field | Type | Description |
|-------|------|-------------|
| id | string | validation bundle ID |
| workspaceId | string | owning workspace |
| previewUrl | string | validation target |
| testSummary | json | test results |
| screenshotSet | json | screenshots |
| consoleSummary | json | browser diagnostics |
| traceRef | string | trace ID or URL |
| reviewerDisposition | string nullable | approved, rejected, needs work |

## Implementation Plan

### Phase 1: MVP

### Goal

Solve the main local DX failures with minimal platform invention.

### Scope

- `agentd` daemon
- workspace manager using git worktrees
- container runtime executor
- developer edge proxy with `.localhost` routing
- Mission Control workspace grid
- basic logs and event feed
- browser sidecar for simple validation
- manual review bundle generation

### Suggested stack

- Go or Rust daemon
- SQLite metadata store
- Docker runtime
- Caddy reverse proxy
- React or Tauri Mission Control UI
- Playwright sidecar

### Success criteria

- user can run 3-5 workspaces in parallel
- each workspace has a stable hostname
- no manual port picking
- user can identify a notification source instantly
- user can inspect diffs and preview from one place

### Phase 2: Reliability and Observability

### Scope

- OpenTelemetry instrumentation
- trace explorer integration
- budget controls and loop detection
- auth broker
- validation checklists
- richer review bundles
- VS Code extension

### Success criteria

- each run has trace and cost visibility
- auth succeeds through stable broker routes
- repeated failure loops auto-pause
- review artifacts are generated consistently

### Phase 3: Agent-Native Desktop

### Scope

- microVM runtime option
- richer policy engine
- resumable workspace desktop state
- side-by-side embedded editor and preview
- replayable run journal
- remote workspace mode

### Success criteria

- stronger isolation for risky or long-lived workspaces
- durable workspace restoration after reboot
- replayable postmortem for failures
- cloud-backed workspaces under same abstraction

## Security Model

### Principles

- least privilege by default
- isolate runtime from host wherever possible
- do not expose secrets to general logs
- gate dangerous commands
- separate human and agent credentials when possible

### Recommended practices

- use environment scoping per workspace
- use short-lived auth broker state
- redact tokens from trace exports
- restrict write scope to workspace path
- record all approval actions

## Performance Considerations

### Likely bottlenecks

- container boot latency
- package install duplication
- browser sidecar overhead
- trace volume growth

### Mitigations

- shared dependency caches
- warm base images
- optional sidecar modes
- log retention policy
- archive old traces and screenshots

## Open Questions

- Should Mission Control be desktop-first with Tauri, or web-first with a small tray daemon?
- Should workspace previews default to HTTP or local HTTPS from day one?
- How much of the auth broker belongs in the product versus project templates?
- Should validation run continuously or only on explicit checkpoints?
- What is the right abstraction for editor integration across non-VS Code surfaces?

## Product Summary

TakomiDX should not be built as "yet another agent terminal".

It should be built as a local developer platform with:

- workspace capsules
- stable hostnames
- auth routing
- observability
- browser-aware validation
- human-centered review loops

If implemented well, the user experience changes from:

- too many terminals
- lost ports
- broken auth
- black-box runs
- ignored PR dumps

to:

- one control plane
- one stable workspace model
- one reviewable validation loop
- many agents operating safely in parallel

That is the product.
