# Coding Guidelines

> **This document is the law for TakomiDX.** If code, task prompts, or older notes conflict with this file, this file wins.

---

## The Verification Protocol (MANDATORY)

### After every TypeScript or TSX edit

Run:

```bash
pnpm typecheck
```

If this fails:

1. Stop.
2. Fix the type error before touching another file.
3. Re-run until it passes.

### Before any handoff or done claim

Run:

```bash
python scripts/vibe-verify.py
```

All checks must pass unless the user explicitly accepts a failing state.

---

## The Blueprint and Build Protocol

### Phase 1: Blueprint

Before implementing any non-trivial feature:

1. Read the matching `docs/issues/FR-XXX.md` file.
2. Check `docs/features/` for adjacent architecture and implementation context.
3. Create or update a feature doc if the work changes the system shape materially.
4. Confirm server/client boundaries and contract changes before coding.

### Phase 2: Build

1. Announce which FR you are implementing.
2. Build one coherent slice at a time.
3. Keep feature work aligned to the issue acceptance criteria.
4. Run `pnpm typecheck` after every meaningful TS change set.
5. Update the issue file as acceptance criteria are completed.

### Phase 3: Finalization

1. Run `python scripts/vibe-verify.py`
2. Confirm acceptance criteria
3. Update docs affected by the implementation
4. Produce a handoff summary with real verification status

---

## Monorepo Rules

### Package boundaries

- `apps/mission-control` owns the user-facing control-plane UI.
- `services/agentd` owns orchestration state and local control-plane behavior.
- `packages/contracts` owns shared schemas, enums, ID rules, and payload contracts.
- Shared config should live in packages only when more than one surface truly depends on it.

### Dependency rules

- UI code must not reach into service internals directly.
- `agentd` must expose stable contracts rather than leaking implementation details.
- Reuse `@takomi/contracts` for all shared event, status, auth, validation, and workspace models.

---

## Next.js App Router Rules

### Defaults

- Server Components by default
- Client Components only when interactivity or browser APIs require them
- Route handlers under `app/api/.../route.ts`
- Explicit caching behavior

### UI architecture

- Mission Control is a product surface, not a generic admin panel.
- Optimize for clarity and attribution.
- Every stateful screen must make workspace identity obvious.
- Every alert, banner, and notification must name the workspace it belongs to.

---

## `agentd` Service Rules

- Keep orchestration logic explicit and inspectable.
- Prefer predictable service modules over clever abstractions.
- Lifecycle, runtime, routing, auth, observability, validation, and policy should be separate modules with clear interfaces.
- Stop reasons, pause reasons, and failure reasons must be structured data, not free-form log strings.

---

## Type Safety and Validation

### Shared contracts

- All shared payloads must be defined in `@takomi/contracts`.
- Use Zod for runtime validation at service boundaries.
- Derive TypeScript types from schemas where possible.

### Inputs

- Validate all external inputs.
- Validate workspace creation payloads, auth callback state, route registration payloads, and validation bundle payloads.
- Never trust browser or process input without schema validation.

---

## Component and File Rules

### Components

- A component should do one thing.
- Extract stateful logic into hooks only when the hook improves clarity.
- Avoid `useMemo` and `useCallback` by default unless profiling or existing patterns justify them.
- Prefer readable flow over clever composition.

### File size

- Components over 200 lines should be treated as a warning sign.
- Service files should stay focused on one domain concern.

---

## Styling Rules

- Use Tailwind utility-first styling in the Mission Control app.
- Prefer tokens and shared primitives over one-off styling drift.
- The interface should feel intentional, technical, and high-signal.
- Avoid bland dashboard defaults.

---

## Testing Rules

- Add tests for domain logic and state transitions with meaningful assertions.
- Prioritize tests around workspace lifecycle, routing, auth state handling, policy decisions, and validation bundle creation.
- Use browser-based verification for user-facing control-plane behavior where appropriate.

---

## Scope Discipline

- Build only what the current FR requires.
- If a future feature starts leaking into the implementation, stop and defer it.
- Do not implement microVM, remote execution, or multi-user collaboration in MVP codepaths.

---

## Recovery Protocol

If a change breaks the system:

```bash
git status
git diff
pnpm typecheck
python scripts/vibe-verify.py --quick
```

Revert only the specific change needed. Do not paper over failing checks with TODOs or comments.
