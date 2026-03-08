# VS Code Companion

## Purpose

Expose TakomiDX workspace awareness inside VS Code, complementing the CLI-first workflow without rebuilding a full review surface in the editor.

## Scope

- show active **Managed** and **Attached** workspaces from `agentd`
- surface status, validation, approval, and attached-run context summaries in a tree view
- provide one-click actions for previews, logs, traces, and Mission Control deep-links
- keep the editor surface read-only and deep-link oriented
- provide quick-access to workspace worktrees and repo paths

## Boundaries

- `packages/contracts` owns the editor companion schemas
- `services/agentd` owns the `/api/v1/editor/workspaces` read model
- `apps/vscode-companion` owns the VS Code tree, commands, and `agentd` client
- **TakomiDX CLI** is the primary driver for creating and starting runs
- **Mission Control** remains the primary "Review Plane" for deep trace and validation review

## UX Model

- root tree items are active workspaces, with attached workspaces prefixed as `[Ext]`
- child rows show status, validation health, approval state, run context, and active auth sessions
- action rows trigger focused commands or open external observability links
- runtime logs open as editor text documents for easy searching
- preview and Mission Control routes open in VS Code's internal browser when available
- preview actions prefer the runtime `manualFallbackUrl` when the local `.takomi.localhost` route is not yet healthy

## Verification

The companion is verified against the hybrid run model, ensuring it correctly displays PID and CWD metadata for attached projects alongside orchestrator state for managed capsules.

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
