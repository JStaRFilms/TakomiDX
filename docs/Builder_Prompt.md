# Builder Prompt

## Stack-Specific Instructions

TakomiDX is a pnpm workspace monorepo with a web-first control plane and a local daemon shell.

### MVP stack

- `apps/mission-control`: Next.js App Router + React + Tailwind
- `services/agentd`: TypeScript Node.js service shell for MVP
- `packages/contracts`: shared zod schemas, IDs, enums, and event contracts
- package manager: `pnpm`
- task runner: `turbo`

### Architectural rules

- Build local-first.
- Use container-backed isolation for MVP.
- Treat Mission Control as the primary product surface.
- Keep `agentd` as the orchestration source of truth.
- Share all stable types and schemas through `@takomi/contracts`.
- Do not add microVM, remote execution, or multi-user behavior during MVP implementation.

## MUS Priority Order

1. FR-001: Workspace lifecycle management
2. FR-002: Isolated runtime execution and stable preview routing
3. FR-003: Mission Control dashboard and workspace detail views
4. FR-004: Local auth broker for workspace-safe OAuth
5. FR-005: Agent observability, spend visibility, and policy controls
6. FR-006: Browser-aware validation bundles
7. FR-007: VS Code companion integration

## Build Sequence

1. Lock repo scaffold and shared contracts.
2. Implement workspace lifecycle.
3. Implement runtime boot and stable routing.
4. Implement auth broker.
5. Implement Mission Control UI against real state contracts.
6. Implement observability and policy hooks.
7. Implement browser validation bundles.
8. Implement VS Code extension as a thin companion surface.
9. Run integration verification and doc sync.

## Special Considerations

- The Genesis backfill happened after early planning, so the PRD and issue files are now the binding source of truth.
- Task 04 is already in progress. Any work there must be reconciled against FR-004 and the updated coding guidelines before it is marked complete.
- Keep the MVP narrow. Do not introduce future-state features because they are conceptually adjacent.
- Use the workspace capsule model consistently across code, docs, and UI naming.

## Builder Operating Rules

- Reference the relevant `docs/issues/FR-XXX.md` issue before implementing a feature.
- Treat `docs/Coding_Guidelines.md` as binding.
- Run root verification before handoff using `python scripts/vibe-verify.py`.
- If a requirement conflicts with older task assumptions, prefer the PRD and issue files, then update downstream docs.
- **UI Design System Enforcement:** The Mission Control UI uses the V1 "Terminal Noir" design system defined in `apps/mission-control/app/globals.css`. Never use generic Tailwind colors (e.g., `text-blue-500`). Always use CSS variables (`var(--color-primary)`, `var(--color-surface)`) and mono/sans font pairings to maintain the hacker terminal control-plane aesthetic.
