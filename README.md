# TakomiDX

TakomiDX is a local-first workspace orchestration platform for multi-agent coding flows.

## MVP Foundation

- Mission Control is a web-first Next.js shell in `apps/mission-control`.
- `agentd` is a local control-plane service shell in `services/agentd`.
- Shared contracts live in `packages/contracts`.
- Runtime metadata is stored under `.takomi/` and is not committed.

## Repo Layout

```text
apps/
  mission-control/
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
