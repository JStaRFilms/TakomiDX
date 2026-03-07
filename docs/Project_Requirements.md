# Project Requirements Document

## Project Overview

**Name:** TakomiDX  
**Mission:** Give developers a local control plane for running, supervising, validating, and reviewing multiple coding agents without localhost chaos.  
**Tech Stack:** pnpm workspace monorepo, Next.js App Router, TypeScript, React, Tailwind CSS, Zod, Turbo, Node.js service shell for `agentd`

## Product Constraints

- MVP is local-first.
- MVP is web-first for Mission Control.
- MVP runtime isolation uses containers, not microVMs.
- MVP supports one active human user on one machine.
- MVP editor integration targets VS Code only.
- Remote execution, microVMs, and team governance are not part of the first release.

## Minimum Usable State

TakomiDX v1 must make the following workflow credible:

1. A developer creates multiple agent workspaces from one control surface.
2. Each workspace runs in isolation and gets a stable preview hostname.
3. The user can see what each workspace is doing without terminal hunting.
4. Auth callbacks work reliably across concurrent local workspaces.
5. The system records key agent activity, cost, and pause reasons.
6. Each workspace produces validation evidence before it is considered done.
7. The developer can inspect the same workspace from Mission Control and VS Code.

## Functional Requirements

| FR ID | Description | User Story | Status |
| :--- | :--- | :--- | :--- |
| FR-001 | Workspace lifecycle management | As a developer, I want to create, restore, archive, and delete isolated workspaces, so that each agent task has a durable place to run. | MUS |
| FR-002 | Isolated runtime execution and stable preview routing | As a developer, I want each workspace to run without port collisions and expose a stable local hostname, so that I can open the right preview without guessing ports. | MUS |
| FR-003 | Mission Control dashboard and workspace detail views | As a developer, I want one dashboard for active workspaces, so that I can see status, last action, validation state, and next required action at a glance. | MUS |
| FR-004 | Local auth broker for workspace-safe OAuth | As a developer, I want auth callbacks to resolve to the correct workspace regardless of runtime port, so that login flows do not break during concurrent local development. | MUS |
| FR-005 | Agent observability, spend visibility, and policy controls | As a developer, I want to see what each agent did, how much it cost, and why it paused or failed, so that I can trust and debug the system. | MUS |
| FR-006 | Browser-aware validation bundles | As a developer, I want each workspace to generate validation evidence from a live preview, so that I can review real behavior instead of trusting raw code output. | MUS |
| FR-007 | VS Code companion integration | As a developer, I want to inspect workspaces from VS Code, so that I can open previews, logs, traces, and approvals without leaving my editor. | MUS |
| FR-008 | Replayable run journal | As a developer, I want to replay prior agent runs, so that I can understand failures and resume from known checkpoints. | Future |
| FR-009 | Stronger microVM-based isolation | As a platform-conscious developer, I want higher-trust runtime isolation, so that risky agent actions run in safer execution boundaries. | Future |
| FR-010 | Remote and hybrid workspace execution | As a team using both local and remote compute, I want workspaces to run on either substrate behind one abstraction, so that I can scale beyond one machine. | Future |
| FR-011 | Team review queues and governance | As an engineering team, I want shared review queues, approvals, and policy controls, so that agent workflows can be standardized across multiple developers. | Future |

## Scope Notes

### In Scope for v1

- single-user local control plane
- isolated local workspaces
- stable preview routing
- local auth broker
- Mission Control UI
- browser-backed validation bundles
- baseline observability and policy controls
- VS Code extension

### Explicitly Out of Scope for v1

- multi-user collaboration
- enterprise policy management
- remote cloud fleet orchestration
- microVM runtime implementation
- broad IDE support beyond VS Code
- generalized plugin ecosystem
