# VS Code Companion

## Purpose

Expose Takomi workspace awareness inside VS Code without rebuilding Mission Control in the editor.

## Scope

- show active workspaces from `agentd`
- surface Mission Control-aligned status, validation, and approval summaries in a tree view
- make preview, logs, trace, validation, approvals, repo, and worktree actions one click away
- keep the editor surface read-only and deep-link oriented

## Boundaries

- `packages/contracts` owns the editor companion schemas
- `services/agentd` owns the `/api/v1/editor/workspaces` read model
- `apps/vscode-companion` owns the VS Code tree, commands, and `agentd` client
- Mission Control remains the source of truth for richer trace, validation, and approval review surfaces

## Contracts

The extension consumes:

- `editorCompanionWorkspaceListResponseSchema`
- `editorCompanionWorkspaceDetailResponseSchema`
- `editorCompanionActionSchema`

These contracts carry:

- workspace identity and status
- validation and approval summaries
- repo and worktree paths
- editor action targets mapped to either preview URLs, Mission Control paths, or filesystem paths

## UX Model

- root tree items are active workspaces
- child rows show status, validation, approval, and any active auth/review state
- action rows trigger focused commands instead of duplicating Mission Control UI
- runtime logs open as editor text documents
- preview and Mission Control routes open in VS Code's simple browser when available
- preview actions prefer the runtime `manualFallbackUrl` when the local `.takomi.localhost` route is not yet attached by the edge proxy layer

## Verification

Current implementation was verified with:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- live `agentd` editor payloads returning fallback preview URLs, Mission Control paths, and filesystem deep links for active workspaces

`python scripts/vibe-verify.py` still skips checks because its command wiring is not configured yet.
