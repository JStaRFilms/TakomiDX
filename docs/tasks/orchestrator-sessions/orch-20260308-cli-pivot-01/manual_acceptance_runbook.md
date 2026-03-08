# TakomiDX CLI-First Pivot Manual Acceptance Runbook

This is the real-life operator test for the CLI-first pivot.

Run it in order. Do not skip to random steps, because later checks depend on earlier state being visible in `agentd`, Mission Control, and VS Code.

## Goal

Prove that the current milestone works for:

- attached external sessions
- owned CLI-launched runs
- attached preview routing
- Mission Control read models
- VS Code companion read models
- managed workspace regression safety

## Test Environment

Use exact dates in your notes: this runbook was written for **March 8, 2026**.

Recommended local setup:

- terminal 1: app stack
- terminal 2: attached preview server
- terminal 3: CLI commands
- browser: Mission Control
- VS Code: companion extension

## Test Data

Use disposable local folders so your notes are repeatable.

Create these:

```powershell
$root = "C:\Temp\takomidx-manual"
New-Item -ItemType Directory -Force -Path "$root\attach-repo" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\run-repo" | Out-Null
```

## 1. Start the System

From the repo root:

```powershell
pnpm dev
```

Open:

- Mission Control: `http://127.0.0.1:3000`
- agentd health: `http://127.0.0.1:4000/healthz`

Expected:

- Mission Control loads without sample-data fallback messaging
- `healthz` returns JSON

If this fails, stop here and report it as a base-surface blocker.

## 2. Build the CLI

From the repo root:

```powershell
pnpm --filter takomidx build
```

Use this command form for the rest of the runbook:

```powershell
node packages/takomidx/dist/cli.js
```

Expected:

- build succeeds
- `node packages/takomidx/dist/cli.js help` shows `run`, `attach`, `status`, `open`, and `logs`

## 3. Attached Preview Scenario

In terminal 2, start a simple local preview server:

```powershell
node -e "require('node:http').createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<h1>attach-preview-ok</h1>');}).listen(4420,'127.0.0.1')"
```

In terminal 3, attach it to TakomiDX:

```powershell
node packages/takomidx/dist/cli.js attach --tool codex --label Codex --pid 4242 --preview-port 4420 --health-path / --cwd C:\Temp\takomidx-manual\attach-repo
```

Expected in terminal:

- a run id is printed
- preview registration succeeds
- no unknown-option errors

Expected in Mission Control:

- a workspace appears with slug `attach-repo`
- mode is `attached`
- ownership is external
- tool family shows `codex`
- PID shows `4242`
- CWD points to `C:\Temp\takomidx-manual\attach-repo`
- health is healthy

Expected preview behavior:

- open `http://attach-repo.takomi.localhost/`
- page should render `attach-preview-ok`

If the custom host fails:

- note whether Mission Control showed fallback or degraded state
- capture whether the preview still works on `http://127.0.0.1:4420/`

## 4. Owned CLI Run Scenario

In terminal 3:

```powershell
node packages/takomidx/dist/cli.js run --label "CLI Runner" --tool takomi --cwd C:\Temp\takomidx-manual\run-repo -- cmd /c echo task5-run
```

Expected in terminal:

- a run id is printed
- `task5-run` prints
- the process exits with code `0`
- no Node `DEP0190` warning appears
- the CLI says the run remains open until validation or review marks it complete

Expected in Mission Control:

- a second workspace appears with slug `run-repo`
- mode is `attached`
- ownership is owned
- tool family is `takomi`
- status stays reviewable and should not flip to false failed state just because validation has not run yet
- last action mentions that the process exited successfully and is waiting for validation or review

## 5. Mission Control Review Pass

For both `attach-repo` and `run-repo`:

- open the workspace detail page
- confirm mode pill is correct
- confirm agent label is correct
- confirm attached workspace disables web-launcher style controls that do not apply
- confirm owned/external semantics are understandable without reading raw JSON

Expected:

- attached workspace does not pretend Takomi owns the process
- owned CLI run is distinguishable from external attached run
- CWD and PID are visible where available

## 6. VS Code Companion Pass

Open VS Code with the companion enabled.

Checks:

- refresh the TakomiDX tree
- confirm `attach-repo` appears with `[Ext]` prefix
- confirm `run-repo` appears without `[Ext]`
- open the tooltip for both
- confirm attached tooltip includes tool family, PID, and CWD
- trigger the logs action on `attach-repo`

Expected:

- attached workspaces are marked as external with `[Ext]`
- logs action for attached workspaces does not hard-fail on Docker assumptions
- the extension should redirect or inform you to use Mission Control observability for attached logs

Important:

- do not report a bug saying the tree should show `[Managed]` or `[Attached]` labels everywhere
- current expected behavior is only `[Ext]` for attached items

## 7. Managed Workspace Regression Check

This is the only part that depends on whether Docker and your repo state are usable.

In Mission Control:

- use the managed workspace provisioning flow
- point it at a real repo path you are comfortable using for a disposable managed test
- create a workspace with a unique slug like `managed-smoke`

Expected:

- workspace is created
- mode is `managed`
- worktree path is provisioned
- detail page opens correctly

If Docker is available, continue:

- start a run from the UI
- start runtime from the UI
- watch runtime status and logs

Expected:

- managed workspace controls remain usable
- no attached-workspace restrictions leak into managed flows

If Docker is not available:

- record this as `verification blocked by local environment`
- do not file it as a product bug unless the UI falsely reports success

## 8. Cross-Surface Identity Check

For `attach-repo`, `run-repo`, and `managed-smoke` if created:

- compare slug in terminal output
- compare slug in Mission Control
- compare slug in VS Code
- compare mode and ownership semantics across surfaces

Expected:

- no duplicate workspace identities
- no mismatched slug or mode between surfaces
- no case where Mission Control says owned and VS Code says external, or vice versa

## 9. Failure Checks

Do these only after the happy path works.

### 9A. Broken attach preview

Stop the preview server from step 3.

Then:

- refresh Mission Control
- reopen `attach-repo`

Expected:

- preview health degrades or fallback behavior becomes visible
- stale healthy state should not persist forever

### 9B. Bad CLI attach input

Run:

```powershell
node packages/takomidx/dist/cli.js attach --tool codex --pid not-a-number --cwd C:\Temp\takomidx-manual\attach-repo
```

Expected:

- CLI fails clearly
- error mentions invalid numeric input

## 10. What To Report Back

For each issue, send exactly this:

```text
Step:
Date:
Surface: terminal | Mission Control | VS Code | preview route
Command or click path:
Expected:
Actual:
Severity: blocker | major | minor
Screenshot/log:
```

```
Step: 5 / attached preview view
Date: March 8, 2026
Surface: Mission Control
Command or click path: attach workspace via CLI, then open workspace Preview tab
Expected: Preview tab should show the live attached preview when attach-repo.takomi.localhost is reachable
Actual: Preview tab says offline even though the custom host opens successfully in a new tab
Severity: major
Screenshot/log: include both screenshots you sent

Step: 7 / managed runtime regression
Date: March 8, 2026
Surface: Mission Control runtime boot
Command or click path: create managed workspace, then Start Runtime
Expected: Runtime should boot with a valid dev command for the target repo
Actual: Runtime fails because the generated/default command passes --hostname/--port to turbo incorrectly and uses incompatible shell/env syntax for the container
Severity: major
Screenshot/log: include the turbo error output

Step: 7 / managed runtime detail header
Date: March 8, 2026
Surface: Mission Control
Command or click path: open managed workspace after runtime failure
Expected: Status badges should be easy to interpret
Actual: Multiple badges appear at once (for example running + stopped), which is technically explainable but confusing
Severity: minor
Screenshot/log: include the badge screenshot

```



## Pass / Fail Rule

Mark the run as **pass** only if:

- attach flow works with `--tool codex`
- owned run flow works without false failure on clean process exit
- attached preview route is visible in Mission Control and works through `.takomi.localhost` when healthy
- VS Code accurately reflects attached state with `[Ext]`
- managed workspace flow is either working or explicitly blocked only by local Docker/environment limits

Mark the run as **fail** if any of these happen:

- unknown CLI flags for the documented attach flow
- owned run is marked failed only because validation has not run yet
- attached workspace is shown as Takomi-owned
- Mission Control or VS Code lose workspace identity across surfaces
- managed flow regresses because of the attached-workspace changes
