# Agentic Coding Problems: Solution Ideas

---

## Problem 1: Parallelism is "Rough"

**Solution A — Custom Agent Orchestrator (Custom Build)**
Build a lightweight local daemon ("AgentD") that accepts task definitions via a simple config file or CLI command. It spawns agents as isolated child processes, tracks their lifecycle, and exposes a unified status API. Think of it as `pm2` but purpose-built for agentic workloads. Chosen because existing process managers lack the semantic awareness (task name, agent type, cost) that multi-agent workflows require.

**Solution B — tmux + TUI Dashboard (Hybrid)**
Pair a scriptable `tmux` session manager with a custom Rust/Go TUI (terminal UI) that displays all running agents in a split dashboard with live status, cost, and output previews. The TUI subscribes to structured log streams from each agent. Chosen because it reuses battle-tested terminal multiplexing infrastructure while adding the missing semantic layer cheaply.

**Solution C — VS Code Extension with Parallel Task Runner (Integrated Stack)**
A VS Code extension that integrates with the Tasks API and existing agent CLIs (Claude Code, Aider, etc.), launching agents as named background tasks with a custom sidebar panel showing progress, output, and status. Leverages the existing editor surface most developers already live in. Chosen because it meets developers where they already are without requiring a new environment.

---

## Problem 2: Port Collisions

**Solution A — Local DNS + Reverse Proxy Layer (Custom Build)**
Build a local service that acts as a miniature internal DNS resolver and reverse proxy. Each agent session is assigned a stable subdomain (e.g., `agent-feature-auth.localhost`) that maps to an automatically allocated port. A `hosts`-file manager keeps the mappings fresh. Chosen because subdomains eliminate numeric port juggling entirely and compose cleanly with OAuth redirect URIs.

**Solution B — Docker Compose per Agent Workspace (Hybrid)**
Each agent workspace gets a `docker-compose.yml` generated automatically, placing the dev server, database, and any dependencies in a shared network with deterministic internal ports. A shared Traefik container routes subdomains to the correct compose stack. Chosen because it leverages proven container networking while keeping local parity with production environments.

**Solution C — Caddy + Port Registry Service (Integrated Stack)**
A small background process maintains a port registry (a flat file or SQLite db) and wraps agent startup scripts to claim the next free port before launch. A locally running Caddy server auto-generates reverse proxy routes from the registry. Chosen for its extremely low operational overhead — Caddy's automatic config reloading removes the need for manual restarts.

---

## Problem 3: Authentication & Redirects Break

**Solution A — Local OAuth Proxy (Custom Build)**
Build a persistent local OAuth proxy service that always listens on a single stable address (e.g., `auth.localhost:4000`). All agent dev servers register their current port with the proxy. Incoming OAuth callbacks are received at the stable address and then forwarded to the correct agent. OAuth provider config never needs to change. Chosen because it decouples the OAuth surface from the ephemeral dev server port entirely.

**Solution B — mkcert + Wildcard Subdomain + Auth Middleware (Hybrid)**
Use `mkcert` to issue a trusted wildcard certificate for `*.localhost`. Pair this with a thin auth middleware (e.g., a shared NextAuth instance) that all agent dev servers point to, running on its own stable port. Chosen because it reuses the proven NextAuth ecosystem while making the auth layer a stable shared service rather than per-app logic.

**Solution C — Ngrok / Cloudflare Tunnel per Agent (Integrated Stack)**
Automatically provision a stable public tunnel URL per agent workspace at startup. Register this URL with OAuth providers via their APIs (GitHub and Google both support programmatic redirect URI management). Chosen because it fully sidesteps the localhost constraint and has the bonus of making sharing a preview trivially easy.

---

## Problem 4: Context Switching & "Lost" Terminals

**Solution A — Agent Mission Control (Custom Build)**
A standalone Electron or Tauri desktop app that serves as a unified dashboard for all running agents. Each agent has a "card" showing its name, current task, status, and a live tail of its output. Notifications route to the specific card rather than a generic OS ding. Chosen because it gives agents a dedicated visual surface equivalent to a project management board.

**Solution B — Zellij + Semantic Layout Plugin (Hybrid)**
Use Zellij (a modern terminal multiplexer with a Wasm plugin system) and write a plugin that auto-generates named panes per agent, color-codes them by status, and routes OS notifications with agent context. Chosen because Zellij's plugin API makes it far more extensible than tmux for building semantic awareness on top of terminal sessions.

**Solution C — Slack/Discord Bot as Agent Notification Bus (Integrated Stack)**
Route all agent status updates and completion events through a local bot that posts to a dedicated Slack or Discord channel per agent. Uses webhooks so no infrastructure is needed. Developers already monitor these platforms, making the notification channel natural rather than new. Chosen for near-zero implementation cost and high integration with existing team workflows.

---

## Problem 5: The "Black Box" Observability Problem

**Solution A — Local OpenTelemetry Collector + Grafana Stack (Custom Build)**
Instrument agent wrapper scripts to emit structured traces and spans to a local OpenTelemetry collector, then pipe to a local Grafana + Tempo instance. Each tool call, token usage event, and error gets a span. Chosen because OTel is the industry standard for distributed tracing and the entire stack can run locally with a single `docker-compose up`.

**Solution B — Agent Logging SDK with SQLite Backend (Hybrid)**
Build a thin logging SDK (usable as a wrapper or sidecar) that intercepts tool calls, records them with timestamps and token counts to a local SQLite DB, and exposes a simple web UI for querying the trace history. Chosen because SQLite requires no server infrastructure and the web UI can be as simple as a Datasette instance.

**Solution C — Langfuse / Langsmith Local Mode (Integrated Stack)**
Deploy Langfuse (open-source LLM observability) locally via Docker and instrument agents to emit traces via its SDK. This provides a full trace explorer, cost dashboard, and session replay out of the box. Chosen because it is purpose-built for LLM observability and eliminates the need to build any of the UI or trace storage layer from scratch.

---

## Problem 6: The "PR Dumping" Problem

**Solution A — "Sandbox Preview" CI Step (Custom Build)**
Build a CI pipeline step that, on every PR opened by an agent, automatically spins up a full ephemeral preview environment (e.g., via Railway, Fly.io, or a custom k8s namespace), runs the test suite, and posts a live preview URL as a PR comment. The PR is blocked from merge until a human clicks "Verified." Chosen because it forces the human verification step into the PR workflow rather than relying on developers to manually pull and run code.

**Solution B — Local-First Agent Workflow with Git Worktrees (Hybrid)**
Rather than letting agents push directly to a PR, configure them to work in a `git worktree` — a separate directory that is a checkout of the feature branch. The developer can immediately `cd` into the worktree and run the app locally without switching branches. A small CLI helper opens the worktree in a new terminal + browser tab. Chosen because worktrees make the "play with it locally" step nearly as frictionless as reviewing a PR on GitHub.

**Solution C — PR Review Agent (Integrated Stack)**
Pair the coding agent with a separate "review agent" whose only job is to check out the generated PR, run it, execute tests, check for regressions against a baseline, and write a detailed verification report as a PR comment before any human looks at it. Uses existing CI infra plus an LLM API call. Chosen because it uses AI to solve an AI-created problem — automating the verification step that developers are skipping.

---

## Problem 7: OS/Desktop Paradigm Limitations

**Solution A — Per-Agent Virtual Desktop Profiles (Custom Build)**
Build a macOS/Linux daemon that, on agent launch, creates a new virtual desktop space and opens a pre-configured set of windows (terminal for that agent, browser pointed at its dev server, editor focused on its working directory) in that space. On agent completion, the desktop is archived. Chosen because it maps directly to the mental model Theo describes — each agent gets "its own desktop."

**Solution B — Containerized Dev Environments with a Web UI (Hybrid)**
Use Devcontainers or Nix Flakes to define per-agent isolated environments, each with a full browser-accessible IDE (VS Code Server / code-server) and browser preview. A simple web portal lists all running environments with links. Chosen because it makes agent isolation a first-class concern and the web UI acts as the "fleet overview" that the OS currently lacks.

**Solution C — Mise-en-Place + Windsurf/Cursor Workspace Profiles (Integrated Stack)**
Leverage `mise` (a polyglot runtime manager) to ensure each agent workspace has isolated tool versions, combined with editor workspace profiles that save and restore the exact editor state (open files, panels, terminal sessions) per agent. A wrapper script bootstraps the full context in one command. Chosen for its low complexity — it wires together well-maintained existing tools rather than building new infrastructure.

---

## Problem 8: Terminal Limitations (No Browser/Editor Integration)

**Solution A — Headless Browser Sidecar (Custom Build)**
Build an agent wrapper that automatically launches a Playwright-controlled headless browser alongside each agent session. The browser is wired to the agent's dev server port. A small screenshot/DOM snapshot API lets the agent "see" the UI it is building and include visual feedback in its reasoning loop. Chosen because it closes the most critical gap — agents currently have no way to perceive the visual output of their work.

**Solution B — Zed Editor as Agent Host (Hybrid)**
Use Zed's extension API and built-in terminal to build an extension that hosts the agent process, surfaces its output in a custom panel, and renders the app preview in an embedded WebView pane side-by-side with the code. Chosen because Zed's architecture (Rust, GPU-accelerated, designed for extensibility) makes it well-suited to hosting agents as first-class citizens rather than bolted-on afterthoughts.

**Solution C — VS Code + Agent Bridge Protocol (Integrated Stack)**
Define a lightweight "Agent Bridge" protocol (a local WebSocket server) that any CLI agent can connect to. VS Code extension on the other side listens for events and provides the agent with editor context (open file, selection, lint errors) and browser control (via a VS Code Simple Browser panel). Chosen because it is agent-agnostic — any CLI tool can implement the simple socket protocol to gain editor and browser awareness without being rewritten.
