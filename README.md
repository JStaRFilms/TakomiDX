# TakomiDX

TakomiDX is a local-first workspace orchestration platform for multi-agent coding flows.

## MVP Foundation

- Mission Control is a web-first Next.js shell in `apps/mission-control`.
- `agentd` is a local control-plane service shell in `services/agentd`.
- The VS Code companion lives in `apps/vscode-companion`.
- Shared contracts live in `packages/contracts`.
- Runtime metadata is stored under `.takomi/` and is not committed.

## Repo Layout

```text
apps/
  mission-control/
  vscode-companion/
services/
  agentd/
packages/
  contracts/
  tsconfig/
```

## Local Development

```bash
pnpm bootstrap
pnpm dev
```

Useful commands:

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

VS Code companion commands:

```bash
pnpm --filter takomi-vscode-companion build
pnpm --filter takomi-vscode-companion typecheck
pnpm --filter takomi-vscode-companion test
```

The extension expects these local defaults unless you override them in VS Code settings:

```text
agentd:          http://127.0.0.1:4000
Mission Control: http://127.0.0.1:3000
```

## Browser Runtime Testing

Mission Control's `Start Runtime` flow currently boots a Docker container for the workspace preview.

- Install and run Docker Desktop before using browser-side runtime controls.
- The first runtime boot needs network access so Docker can pull `node:22-alpine`.
- The current `node:22-alpine` image is about 57 MB compressed on `linux/amd64`.
- Fresh Takomi worktrees do not come with `node_modules`, so the runtime command should install dependencies before starting the dev server.

Recommended first-run checks:

```powershell
docker pull node:22-alpine
```

Default runtime commands:

```text
Next.js: sh -lc "corepack enable && pnpm install && pnpm dev --hostname 0.0.0.0 --port 3000"
Vite:    sh -lc "corepack enable && pnpm install && pnpm dev --host 0.0.0.0 --port 5173"
```

Notes:

- Keep the container image as `node:22-alpine` unless the target project needs a different runtime.
- Use container port `3000` for the default Next.js command and `5173` for the default Vite command.
- Run `Start Runtime` before `Run Validation`, otherwise validation will be blocked because the preview is not reviewable yet.
- Takomi now mounts shared Docker volumes for the `corepack` cache and the pnpm store, so later runs can reuse downloaded package data instead of fetching everything again.
- `node_modules` still lives in the mounted workspace, which means the worktree keeps its installed dependency tree between container restarts.
- Mission Control now polls runtime health and tails container logs while the runtime is booting or running, so the workspace page shows when Docker is still downloading, installing, or waiting for the app to answer health checks.
- The `*.takomi.localhost` preview host is not fully live yet. `agentd` currently writes local reverse-proxy manifests, but a machine-local edge proxy still has to be wired up before those custom hosts answer in the browser. Until then, use the local fallback preview URL shown in Mission Control or surfaced by the VS Code companion.
