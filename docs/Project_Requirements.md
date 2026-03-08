# Project Requirements Document

## Project Overview

**Name:** TakomiDX  
**Mission:** Give developers a CLI-first local control plane for running, supervising, validating, and reviewing multiple coding agents across managed workspaces and attached local projects.  
**Tech Stack:** pnpm workspace monorepo, Next.js App Router, TypeScript, React, Tailwind CSS, Zod, Turbo, Node.js service shell for `agentd`, and a TypeScript CLI.

## Product Constraints

- MVP is local-first.
- MVP is **CLI-first** for all run-management and creation tasks.
- Mission Control is a **secondary** observability and review surface.
- MVP runtime isolation uses containers (for managed) or side-by-side host execution (for attached).
- MVP supports one active human user on one machine.
- MVP editor integration targets VS Code only.
- Remote execution, microVMs, and team governance are not part of the first release.

## Minimum Usable State

TakomiDX v1 must make the following workflow credible:

1. A developer uses the `takomi` CLI to start owned runs or attach external sessions to tracked workspaces.
2. The CLI milestone is centered on `takomi run` for owned runs and `takomi attach` for external sessions.
3. Each managed workspace runs in isolation with a stable preview hostname.
4. Each attached workspace tracks native runs and processes with stable PID/CWD associations.
5. Auth callbacks work reliably across all concurrent local workspaces via the auth broker.
6. The system captures reasoning traces, token costs, and browser logs into a Run Capsule.
7. Mission Control provides a high-fidelity "Review Plane" for inspecting validation evidence.

## Functional Requirements

| FR ID | Description | User Story | Status |
| :--- | :--- | :--- | :--- |
| FR-001 | Workspace lifecycle management | As a developer, I want to provision managed workspaces through the current managed-workspace surfaces, attach external sessions through CLI, and restore/delete tracked workspaces, so that each task has a durable place in the control plane. | MUS |
| FR-002 | Isolated runtime & hybrid execution | As a developer, I want to run agents in isolated containers (managed) or my native host environment (attached) without port chaos. | MUS |
| FR-003 | CLI-first control plane (`takomi`) | As a developer, I want to manage runs, attachments, and status from my terminal, so that I don't have to switch to a browser to start work. | MUS |
| FR-004 | Mission Control review & observability | As a developer, I want a rich dashboard to review traces, validation bundles, and cost histories before merging agent PRs. | MUS |
| FR-005 | Local auth broker for stable OAuth | As a developer, I want auth callbacks to resolve correctly regardless of workspace mode or port, so that my login flows never break. | MUS |
| FR-006 | Browser-aware validation bundles | As a developer, I want to capture screenshots and console logs from a live preview, so that I can verify real behavior. | MUS |
| FR-007 | Agent observability & cost policy | As a developer, I want to see token costs, model usage, and reasoning traces for every run, and set caps to avoid runaway costs. | MUS |
| FR-008 | VS Code companion integration | As a developer, I want to inspect workspaces from my editor, so that I can open previews and deep-link into Mission Control reviews. | MUS |
| FR-009 | Replayable run journal | As a developer, I want to replay prior agent runs, so that I can understand failures and resume from known checkpoints. | Future |
| FR-010 | Stronger microVM-based isolation | As a platform-conscious developer, I want higher-trust runtime isolation for risky agent actions. | Future |
| FR-011 | Team review queues and governance | As an engineering team, I want shared review queues and standardized agent workflows. | Future |

## Scope Notes

### In Scope for v1 (Milestone CLI-Pivot)

- TakomiDX CLI for run/workspace management
- Hybrid execution model (Managed + Attached)
- Stable preview routing and local edge proxy
- Local auth broker
- Mission Control (Observability/Review Plane)
- Browser-backed validation bundles
- OpenTelemetry-backed traces and cost tracking
- VS Code extension

### Explicitly Out of Scope for v1

- Native TakomiDX chat-shell
- multi-user collaboration
- remote cloud fleet orchestration
- microVM runtime implementation
- broad IDE support beyond VS Code
- generalized plugin ecosystem
