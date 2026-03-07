---
type: project
category: Code
client: None
status: active
created: 2026-03-07
tags: [creativeos]
---

# TakomiDX
This is a full breakdown of the problems mentioned in the video **"Agentic Coding Has A HUGE Problem"** by **Theo - t3.gg**.

The core thesis of the video is that while AI coding agents (like Claude Code, Devin, etc.) are powerful, the actual **user experience (UX) and operating system environment** are not built to handle running multiple of them at the same time locally.

Here is the breakdown of every problem mentioned, stated as closely as possible to the video's context:

### 1. Parallelism is "Rough"
Theo states that "doing 5 things in parallel is pretty rough." The current workflow falls apart when you try to multi-task with agents. While you *can* technically run multiple terminal windows, the friction makes it nearly impossible to do effectively.

### 2. Port Collisions (The "Localhost" Problem)
*   **The Issue:** When you run multiple agents working on different projects (or different branches of the same project) simultaneously, they all try to use the same default ports (e.g., `localhost:3000`).
*   **The Consequence:** "Multiple things under localhost all get grouped together which breaks a ton of shit." You end up with agents fighting over ports, or you have to manually assign random ports (3001, 3002, etc.), which leads to the next problem.

### 3. Authentication & Redirects Break
*   **The Issue:** Many apps require OAuth (logging in with Google, GitHub, etc.) which relies on hardcoded redirect URIs (typically `localhost:3000/api/auth/callback`).
*   **The Consequence:** If an agent spins up a development server on `localhost:3001` because port 3000 was busy, the authentication flow fails completely because the external provider redirects back to the wrong port. Theo notes: *"Good luck debugging that."*

### 4. Context Switching & "Lost" Terminals
*   **The Issue:** With multiple agents running in different terminal tabs, you lose track of which agent is doing what.
*   **The Consequence:** You hear a notification sound ("Ding!") indicating an agent is done, but you don't know *which* one.
*   **Quote:** *"Which terminal tab was it? I hop around my terminal windows and tabs for a bit... Finally I can find it... Oh it got assigned to localhost 3001."*

### 5. The "Black Box" Observability Problem
*   **The Issue:** Agents are non-deterministic. They call "arbitrary tools in an arbitrary order with arbitrary failure rates."
*   **The Consequence:** When an agent fails or gets stuck in a loop, it is incredibly difficult to debug *why*. You don't naturally see:
    *   Which tools were called.
    *   If it hallucinated a tool.
    *   How many tokens were burned (cost).
    *   Why it decided to stop.
*   *Note:* He promotes using tracing tools (like Sentry/OpenTelemetry) to solve this, but highlights that the default experience lacks this critical visibility.

### 6. The "PR Dumping" Problem (Cloud vs. Local)
*   **The Issue:** Because running agents locally is so painful, there is hype around "background" or "cloud" agents (like GitHub Copilot Workspace) that just do the work and open a Pull Request (PR).
*   **The Consequence:** Theo argues this creates a bad workflow where *"PRs don't get touched because no one is going to look at this again."*
*   **The Insight:** Real development requires you to "play" with the code locally to verify it works. Cloud agents skip this step, leading to unverified code dumps that developers ignore.

### 7. OS/Desktop Paradigm Limitations
*   **The Issue:** Our current Operating Systems (macOS, Windows, Linux) are designed for a single user focus, not for orchestrating a fleet of autonomous workers.
*   **The Consequence:** We lack a "set of desktops" where each agent has its own isolated environment (Browser + Terminal + Editor) that remains consistent. Currently, these contexts are split across different apps, making it messy to switch between "Agent A's work" and "Agent B's work."

### 8. Terminal Limitations
*   **The Issue:** Current "agentic" tools mostly live in the CLI (Command Line Interface).
*   **The Consequence:** They solve the coding part but don't integrate the browser (previewing the app) or the editor deeply enough to handle the full context of the task.