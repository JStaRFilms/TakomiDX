# Task: TakomiDX Branding Cleanup

**Objective:** Normalize the product name to `TakomiDX` anywhere the app is presented to humans, while preserving stable technical identifiers that intentionally remain `takomi`.
**Priority:** High
**Category:** Refactor / Docs / Product consistency

## Why This Exists

This repo currently mixes:

- `TakomiDX` as the product/app name
- `Takomi` as the CLI command, package scope, env prefix, preview domain, and other technical identifiers
- `Takomidx` in a few places where the casing is simply wrong

That mix is only acceptable when `takomi` is acting as a technical namespace or compatibility identifier. It is not acceptable when the copy is user-facing branding, because there is another separate product named `Takomi` and the `DX` part matters.

## Core Rule

Use this decision rule for every match:

1. If the text is user-facing brand copy, rename it to `TakomiDX`.
2. If the text is a stable technical identifier, preserve `takomi` exactly.
3. If the text is ambiguous, prefer preserving the identifier and only change the surrounding copy.

## Preserve List

Do not rename these unless the user explicitly approves a breaking identity migration:

- CLI command: `takomi`
- VS Code command IDs, view IDs, config keys, activation events, extension IDs
- Package scope: `@takomi/*`
- Env var prefixes: `TAKOMI_*`, `NEXT_PUBLIC_TAKOMI_*`
- Local data dir: `.takomi`
- Preview/auth domains: `takomi.localhost`, `auth.takomi.localhost`
- Schema enum values like `toolFamily: "takomi"`
- Header names and signatures like `x-takomi-edge-proxy`, `takomi-local-edge`
- Internal cache/container/volume names derived from `takomi`
- Historical generated output and local-only files such as `.env.local`, `.takomi/**`, `.next/**`, `.jstar/**`

## Rename Rules

Rename these to `TakomiDX`:

- Titles, headings, descriptions, UI body copy, help text, status/error text shown to users
- README and current product docs when talking about the app/company/product
- Extension descriptions that describe the product in human language
- CLI help text and console messages, while keeping command examples as `takomi ...`
- Any incorrect casing such as `Takomidx`

Keep these as `takomi`:

- Shell commands and command examples
- Import paths and package names
- Machine-readable IDs
- Domains, directories, env vars, and schema defaults that are part of runtime behavior

## Audited Hotspots

### P0: Current source-of-truth, user-facing copy

- `README.md`
- `.env.example`
- `packages/takomidx/src/cli.ts`
- `apps/mission-control/src/features/workspaces/components/create-workspace-panel.tsx`
- `apps/mission-control/src/features/workspaces/components/workspace-detail-header.tsx`
- `apps/mission-control/src/features/workspaces/components/workspace-operator-panel.tsx`
- `apps/vscode-companion/package.json`
- `apps/vscode-companion/src/agentd-client.ts`
- `apps/vscode-companion/src/extension.ts`
- `apps/vscode-companion/src/tree.ts`
- `apps/vscode-companion/src/view-model.ts`
- `services/agentd/src/modules/local-edge-proxy.ts`
- `services/agentd/src/modules/route-registry.ts`

### P1: Current docs and specs

- `docs/features/TakomiDX_Agent_Workspace_Platform_Spec.md`
- `docs/Project_Requirements.md`
- `docs/Founder_Investor_Product_Brief.md`
- `docs/Builder_Prompt.md`
- `docs/Coding_Guidelines.md`
- `docs/features/VSCode_Companion.md`

### P2: Notes and design artifacts

- `00_Notes/DevLog.md`
- `00_Notes/Idea.md`
- `docs/design/*.html`
- `docs/design/Archive/*.html`
- `docs/mockups/home.html`

### P3: Tests and fixtures to align only after copy changes

- `apps/vscode-companion/src/view-model.test.ts`
- `apps/mission-control/src/features/workspaces/data/workspace-detail-data.test.ts`
- `services/agentd/src/config.test.ts`
- `services/agentd/src/health.test.ts`
- Any tests asserting exact user-facing strings

## Known Findings From Audit

- `.env.example` currently uses `TAKOMI_APP_NAME=Takomidx`; this should become `TakomiDX`.
- `README.md` already uses `TakomiDX` in some places, but still uses plain `Takomi` in brand-copy sentences.
- `packages/takomidx/src/cli.ts` mixes correct command usage (`takomi`) with user-facing strings like `Takomi-owned`.
- `apps/vscode-companion/package.json` is mostly correct, but its descriptions still say `Takomi agentd` and `Takomi Mission Control`.
- Mission Control and agentd contain several user-visible status/error strings that still say `Takomi`.

## Implementation Plan

### Phase 1: Normalize current branding copy

- Fix incorrect casing first: `Takomidx` -> `TakomiDX`.
- Update user-facing copy in README, CLI help text, Mission Control UI copy, VS Code extension descriptions, and surfaced server messages.
- Keep all literal command examples as `takomi ...`.

### Phase 2: Verify technical identifiers were not broken

- Re-scan the repo for `Takomi`, `TakomiDX`, `Takomidx`, `takomi`.
- Confirm that preserved identifiers are still intact:
  - `@takomi/*`
  - `takomi` command IDs
  - `TAKOMI_*`
  - `.takomi`
  - `takomi.localhost`
  - `toolFamily: "takomi"`

### Phase 3: Align tests only where needed

- Update only tests that assert changed user-facing strings.
- Do not rewrite tests whose `takomi` values represent technical IDs or domains.

### Phase 4: Optional archive pass

- If time permits, apply the same branding cleanup to notes and archived design docs.
- Do not rewrite historical orchestrator session artifacts unless the user explicitly asks for historical cleanup.

## Acceptance Criteria

- Human-facing brand references are consistently `TakomiDX`.
- Command examples still use `takomi`.
- Runtime identifiers still use `takomi` where required.
- `.env.example` uses `TAKOMI_APP_NAME=TakomiDX`.
- No accidental renames to:
  - package scopes
  - env prefixes
  - domains
  - VS Code IDs/commands/config namespaces
  - schema enum values
- Tests pass after any necessary expectation updates.

## Verification

Run these after the edits:

```powershell
git diff --name-only
pnpm lint
pnpm test
pnpm typecheck
```

Then perform a targeted audit:

```powershell
$files = git ls-files
Select-String -Path $files -Pattern 'Takomidx' -CaseSensitive:$false
Select-String -Path $files -Pattern '\bTakomi\b' -CaseSensitive:$false
```

Manual review rule:

- Remaining `Takomi` matches should be explainable as preserved technical identifiers or intentionally untouched historical docs.

## Review Checklist For Follow-Up Review

Use this checklist when reviewing the implementation:

- Did the agent change any `takomi` command, ID, env key, package scope, domain, or `.takomi` path? If yes, that is a likely regression.
- Did the agent fix `Takomidx` casing everywhere in active files?
- Did the agent update user-facing error/help/status strings to `TakomiDX` where appropriate?
- Did command examples remain `takomi ...`?
- Did the agent avoid editing local-only or generated files?
- Are any remaining `Takomi` strings still visible to users in active surfaces?

## Deliverable

The implementing agent should provide:

1. A short summary of what was changed.
2. A list of intentionally preserved `takomi` identifiers.
3. The verification results for lint, test, and typecheck.
4. Any remaining ambiguous references that need product-owner input.
