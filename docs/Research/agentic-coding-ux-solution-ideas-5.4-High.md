# Agentic Coding UX and OS Friction

## Scope

This document analyzes the eight problems summarized from Theo's "Agentic Coding Has A HUGE Problem" and proposes three distinct solution ideas for each. The goal is diversity of approach, not convergence on a single stack.

Each section includes:

- a short framing of the problem
- three solution ideas with different technical shapes
- a brief rationale for why that stack or methodology fits

## Design Criteria

Across all eight problems, the strongest solutions tend to optimize for:

- isolation of runtime, browser, and editor state
- discoverability of what each agent is doing right now
- durable identity for ports, domains, sessions, and logs
- low-friction handoff between autonomous work and local human verification
- predictable observability, cost tracking, and failure diagnosis

---

## 1. Parallelism Is Rough

The root problem is that today's local setup exposes the user to process-level concurrency instead of task-level orchestration.

### Idea A: Agent Workspace Manager (custom build)

Build a local "agent supervisor" desktop app that creates a named workspace per task with its own terminal, browser preview, logs, and status card. Under the hood it launches isolated processes, reserves resources, and presents all active tasks in one control plane.

**Suggested stack:** Rust or Tauri desktop shell, local process supervisor, SQLite for session state, embedded terminal, browser webviews, MCP-compatible task runner.

**Why this stack:** A custom desktop supervisor directly attacks the UX problem instead of patching terminal workflows. Rust/Tauri keeps the app lightweight while still giving deep OS integration.

### Idea B: Containerized Task Grid (hybrid)

Use Docker or Dev Containers for hard runtime isolation, then add a custom orchestration UI that starts, stops, snapshots, and restores agent tasks. Each container gets a predictable label, mounted repo subset, and reserved network namespace.

**Suggested stack:** Docker Compose, VS Code Dev Containers, Traefik/Caddy, custom Electron dashboard, Redis queue.

**Why this stack:** This reuses mature isolation primitives while only custom-building the missing coordination layer. It is lower risk than inventing a new local runtime from scratch.

### Idea C: Remote Agent Fleet with Local Mirror (integrated stack)

Move parallel execution to ephemeral remote sandboxes and keep the local machine as the approval and verification console. Each task runs remotely, streams terminal and browser state back, and can be "pulled local" when the human wants hands-on control.

**Suggested stack:** GitHub Codespaces or Firecracker-based sandboxes, web dashboard, local companion app, Git provider integration, cloud secrets manager.

**Why this stack:** If local machines are the bottleneck, stop treating them as the execution substrate. This is the highest-complexity approach but scales best for heavy parallelism.

---

## 2. Port Collisions (The Localhost Problem)

The deeper issue is that `localhost` is a shared global namespace but agents need stable, per-task network identity.

### Idea A: Local Domain Fabric (custom build)

Replace port-based access with task-specific local domains such as `task-a.dev.local` or `agent-17.localhost.run`. A local proxy allocates domains automatically and routes to whatever internal port the task actually uses.

**Suggested stack:** Local DNS resolver, Caddy or Envoy, OS hosts integration, automatic service discovery daemon.

**Why this stack:** Humans remember names better than ports, and domain identity scales better into auth, cookies, and browser state. This is the cleanest conceptual fix.

### Idea B: Container Network Isolation (hybrid)

Assign each agent its own network namespace and expose services through a single ingress gateway. The human never touches raw ports; they open services through the orchestrator UI.

**Suggested stack:** Docker networks, Traefik labels, Compose profiles, lightweight service catalog UI.

**Why this stack:** Network namespaces are a proven answer to service collision. This keeps the solution grounded in existing devops tooling.

### Idea C: Browser-Based Preview Broker (integrated stack)

Have agents publish previews to a managed preview service rather than local ports. The platform issues a unique URL per session and handles routing, TLS, and service discovery automatically.

**Suggested stack:** Vercel preview deployments, Cloudflare Tunnel, Ngrok, custom agent metadata layer.

**Why this stack:** This avoids local port management almost entirely. It is fast to adopt, especially for teams already comfortable with hosted preview infrastructure.

---

## 3. Authentication and Redirects Break

This is fundamentally an identity problem: the app URL is unstable, but OAuth providers expect stable redirect origins.

### Idea A: Stable Auth Gateway Domain (custom build)

Introduce a permanent local auth gateway such as `auth.dev.local`. All OAuth providers redirect there first, and the gateway forwards the result to the correct live task based on session metadata.

**Suggested stack:** Local reverse proxy, signed state token router, secure session registry, loopback callback service.

**Why this stack:** It preserves one stable redirect URI while allowing many transient app instances behind it. This is the most direct technical fix to Theo's exact pain point.

### Idea B: Shared Auth Broker Service (hybrid)

Use an external auth service like Auth0, Clerk, or WorkOS as a broker, but wrap it with custom local session routing. Agents do not each own the OAuth flow; they consume already-brokered identity from the local control plane.

**Suggested stack:** Clerk/Auth0/WorkOS, custom session handoff service, local domain fabric, encrypted cookie relay.

**Why this stack:** It offloads tricky provider integration and security hardening while keeping the custom logic focused on multi-instance local development.

### Idea C: Auth Virtualization for Development (integrated stack)

For dev-only agent sessions, replace real OAuth with a virtual identity provider that simulates login flows, seeds test users, and can optionally mint real provider tokens through a secure backend bridge when needed.

**Suggested stack:** OpenID Connect test provider, seeded fixtures, policy engine, optional live-provider bridge.

**Why this stack:** Most parallel agent work does not need real human login every time. This approach optimizes for speed and reliability, at the cost of some production parity.

---

## 4. Context Switching and Lost Terminals

The problem is not just too many tabs. It is missing task identity, ownership, and event routing.

### Idea A: Task-Centric Desktop Shell (custom build)

Create a desktop shell where the primary object is a task card, not a terminal tab. Every card contains its terminal, logs, diffs, preview URL, and last agent action. Notifications deep-link back to the exact workspace.

**Suggested stack:** Tauri desktop app, local event bus, structured task metadata, OS notifications with resume actions.

**Why this stack:** It fixes the UX at the object model level. Instead of teaching users to manage terminals better, it makes terminals secondary.

### Idea B: Terminal Multiplexer Plus Metadata Layer (hybrid)

Keep tmux, WezTerm, or Warp, but add a thin metadata service that tags panes by task, displays live status, and routes alerts with semantic labels like "Agent B failed tests" rather than "pane 7 beeped."

**Suggested stack:** tmux or WezTerm APIs, local daemon, file-based state, notification bridge.

**Why this stack:** This is a pragmatic upgrade path for power users who already live in the terminal and do not want a full new desktop product.

### Idea C: Activity Feed + Replay Timeline (integrated stack)

Build a web dashboard that records every agent event into a per-task timeline: prompts, commands, previews, diffs, failures, and human interventions. Notifications link into the exact moment in the timeline.

**Suggested stack:** OpenTelemetry event ingestion, Postgres or ClickHouse, React dashboard, websocket updates.

**Why this stack:** Timelines solve both navigation and diagnosis. They also become the foundation for later analytics and observability.

---

## 5. The Black Box Observability Problem

Agents feel opaque because their reasoning, tool use, failure modes, and costs are not first-class runtime data.

### Idea A: Native Agent Trace Model (custom build)

Define an agent-specific trace schema where every prompt, tool call, token count, decision branch, retry, and exit reason becomes a structured span. Build a purpose-made inspector for replaying the run.

**Suggested stack:** OpenTelemetry-compatible custom spans, local collector, trace viewer, cost ledger, prompt artifact store.

**Why this stack:** Generic app monitoring is not enough. Agents need a domain-specific observability model that captures cognition-like workflow, not just HTTP latency.

### Idea B: Wrap Existing Observability Platforms (hybrid)

Instrument agent runners with Sentry, OpenTelemetry, Langfuse, Helicone, or Braintrust, then add a thin internal UI that normalizes the views relevant to coding agents.

**Suggested stack:** OpenTelemetry, Sentry, Langfuse, custom aggregation UI, alert routing.

**Why this stack:** This is the fastest route to value. Existing tools already solve ingestion, storage, and much of the analysis surface.

### Idea C: Policy-Driven Agent Runtime (integrated stack)

Instead of only observing failures after the fact, run agents inside a policy-aware runtime that can block bad loops, cap spend, require approval for risky tools, and annotate every stop reason in real time.

**Suggested stack:** Runtime policy engine, tool permission broker, budget manager, trace pipeline, human approval queue.

**Why this stack:** For non-deterministic systems, observability alone is reactive. This approach combines tracing with control, which is more appropriate for production-grade agent fleets.

---

## 6. The PR Dumping Problem (Cloud vs. Local)

The failure mode here is disconnected execution: work is produced without enough embodied verification, so the human never develops confidence in it.

### Idea A: Mandatory Local Validation Loop (custom build)

Design the agent workflow so a PR cannot be marked complete until the human has launched a preview, run a validation checklist, and recorded a short disposition note. The agent can prepare the work, but completion requires local interaction.

**Suggested stack:** Local companion app, git hooks, preview launcher, acceptance checklist engine.

**Why this stack:** It directly operationalizes Theo's point that code must be played with locally. This is a workflow constraint, not just a feature.

### Idea B: Cloud Build, Local Rehydration (hybrid)

Let the cloud agent do the heavy lifting, then generate a reproducible local rehydration bundle: branch, fixtures, env template, preview route, test plan, and diff narrative. The local tool opens the exact environment for inspection in one click.

**Suggested stack:** GitHub app, Codespaces or CI worker, local launcher, branch metadata manifest, devcontainer snapshot.

**Why this stack:** It keeps the scalability of cloud execution while solving the "I am not going to look at this later" problem through a low-friction local handoff.

### Idea C: Reviewable Work Products, Not Just PRs (integrated stack)

Change the output artifact from "here is a PR" to "here is a runnable review package" that includes live preview, guided test script, recorded agent rationale, and risk hotspots. PR creation becomes the last step, not the first.

**Suggested stack:** Preview hosting, structured review manifest, browser-based QA script, git integration.

**Why this stack:** Developers ignore opaque dumps. They are far more likely to engage with a guided, runnable review artifact.

---

## 7. OS/Desktop Paradigm Limitations

Current operating systems are built around user windows and apps, not task capsules containing all the context an autonomous worker needs.

### Idea A: Agent-Native Desktop Environment (custom build)

Create a new shell where each agent runs inside a persistent "workspace desktop" that bundles browser, terminal, editor, secrets, logs, and memory. Switching agents means switching full environments, not individual windows.

**Suggested stack:** Custom shell on top of Electron/Tauri plus native window management APIs, embedded browser/editor components, persistent workspace store.

**Why this stack:** If the OS abstraction is wrong, fixing the app layer only goes so far. This is the boldest product direction and the one most aligned with the thesis.

### Idea B: Workspace Overlay on Existing OS (hybrid)

Keep macOS, Windows, or Linux, but add an orchestration layer that groups windows, processes, and browser profiles into named task spaces with one-click save/restore.

**Suggested stack:** Raycast or PowerToys extensions, browser profile automation, terminal API hooks, editor workspace plugins.

**Why this stack:** This gives most of the benefit without asking users to adopt a replacement operating system. It is the most realistic near-term approach.

### Idea C: Browser-First Agent Operating Plane (integrated stack)

Treat the browser as the primary operating surface. Each task becomes a web workspace with streamed terminal, code browser, live preview, session memory, and collaborative review tools accessible from any device.

**Suggested stack:** Web IDE components, remote execution backend, multi-tenant auth, persistent workspace snapshots.

**Why this stack:** The browser is already the most portable control plane. This direction is strong if the product target is teams rather than solo local developers.

---

## 8. Terminal Limitations

The CLI is strong for commands, weak for mixed-media context involving previews, structured logs, browser state, and visual feedback.

### Idea A: Unified Agent Workbench (custom build)

Build a single-pane workbench where terminal, editor, preview, logs, traces, and task memory are co-located. The agent can act across all surfaces, and the human can inspect them without jumping apps.

**Suggested stack:** Desktop workbench in Tauri or Electron, Monaco editor, xterm.js, embedded browser views, event graph backend.

**Why this stack:** The terminal remains useful, but it becomes one panel in a richer workspace. This is the most direct response to the "CLI-only" constraint.

### Idea B: Deep Editor Extension Suite (hybrid)

Anchor the experience in an editor such as VS Code, Zed, or JetBrains and extend it with agent panes, preview tabs, trace inspectors, and browser-session attachments.

**Suggested stack:** VS Code extension APIs or JetBrains plugin APIs, Playwright session bridge, integrated diff and test panels.

**Why this stack:** Developers already trust their editor as the center of gravity. This makes adoption easier and avoids building a full environment from zero.

### Idea C: Browser Automation as a First-Class Tool Surface (integrated stack)

Treat browser context as equally important as shell context. Agents operate through a tool layer that exposes DOM state, screenshots, network traces, and login/session state alongside terminal commands.

**Suggested stack:** Playwright, Chrome DevTools Protocol, terminal runner, unified action log, visual diffing.

**Why this stack:** Much of application verification is inherently visual and interactive. Bringing the browser into the same control fabric makes agent output materially more trustworthy.

---

## Cross-Cutting Product Directions

If these ideas were consolidated into a single product strategy, there are three especially coherent combinations:

### 1. Local Agent OS

Combine the Agent Workspace Manager, Local Domain Fabric, Stable Auth Gateway, Task-Centric Desktop Shell, Native Agent Trace Model, and Unified Agent Workbench.

**Best for:** A premium desktop tool for serious individual developers or small teams.

### 2. Container-Orchestrated Dev Fleet

Combine the Containerized Task Grid, Container Network Isolation, Shared Auth Broker Service, Terminal Multiplexer Metadata Layer, wrapped observability tooling, and cloud-build/local-rehydration flow.

**Best for:** Teams that want fast adoption and strong leverage from existing tooling.

### 3. Cloud Execution with High-Fidelity Local Review

Combine the Remote Agent Fleet, Preview Broker, Auth Virtualization, Activity Timeline, policy-driven runtime, runnable review packages, browser-first operating plane, and browser automation tool surface.

**Best for:** Organizations prioritizing scale, remote collaboration, and centralized governance.

---

## Final Take

The common pattern across all eight problems is that coding agents are being forced into abstractions meant for humans: terminal tabs, global localhost, app-by-app windows, and weak task identity.

The most promising solution category is not "better prompts" or "smarter agents." It is a new orchestration layer that makes task identity, environment isolation, browser context, observability, and human verification first-class concepts.

If you want a next step, this document is ready to be turned into:

- an MVP product brief
- a prioritized architecture recommendation
- a feature comparison matrix
- a phased build roadmap
