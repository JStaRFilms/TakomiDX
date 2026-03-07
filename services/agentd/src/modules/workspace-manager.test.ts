import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  WorkspaceLifecycleError,
  createWorkspaceManager,
  type GitWorktreeCreateInput,
  type GitWorktreeDeleteBranchInput,
  type GitWorktreeDriver,
  type GitWorktreeRemoveInput,
} from "./workspace-manager";

const tempDirs: string[] = [];

function createTempDir() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "takomi-workspaces-"));
  tempDirs.push(directory);
  return directory;
}

function createFakeGitDriver() {
  const addCalls: GitWorktreeCreateInput[] = [];
  const removeCalls: GitWorktreeRemoveInput[] = [];
  const deleteBranchCalls: GitWorktreeDeleteBranchInput[] = [];

  const driver: GitWorktreeDriver = {
    async add(input) {
      addCalls.push(input);
      mkdirSync(input.worktreePath, { recursive: true });
    },

    async remove(input) {
      removeCalls.push(input);
      rmSync(input.worktreePath, { force: true, recursive: true });
    },

    async deleteBranch(input) {
      deleteBranchCalls.push(input);
    },
  };

  return {
    driver,
    addCalls,
    removeCalls,
    deleteBranchCalls,
  };
}

function createDeterministicManager(root: string, driver: GitWorktreeDriver) {
  const repoPath = path.join(root, "repo");
  mkdirSync(repoPath, { recursive: true });

  let workspaceCounter = 0;
  let eventCounter = 0;

  return {
    repoPath,
    manager: createWorkspaceManager({
      previewDomain: "takomi.localhost",
      stateDir: path.join(root, ".takomi", "state"),
      workspacesDir: path.join(root, ".takomi", "workspaces"),
      worktreeRootDir: path.join(root, ".takomi", "worktrees"),
      gitDriver: driver,
      now: () => new Date("2026-03-07T03:07:31.000Z"),
      idGenerator: () => `ws_workspace${++workspaceCounter}`,
      eventIdGenerator: () => `evt_${++eventCounter}`,
    }),
  };
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("workspace manager", () => {
  it("creates durable metadata and artifact directories for a workspace", async () => {
    const root = createTempDir();
    const git = createFakeGitDriver();
    const { manager, repoPath } = createDeterministicManager(root, git.driver);

    const workspace = await manager.create({
      slug: "billing-fix",
      repoPath,
      baseBranch: "main",
    });

    expect(workspace.branch).toBe("agent/billing-fix");
    expect(workspace.previewHost).toBe("billing-fix.takomi.localhost");
    expect(workspace.status).toBe("queued");
    expect(existsSync(workspace.artifacts.logsDir)).toBe(true);
    expect(git.addCalls).toHaveLength(1);

    const persisted = JSON.parse(
      readFileSync(path.join(workspace.artifacts.root, "meta.json"), "utf8"),
    );
    expect(persisted).toMatchObject({
      id: workspace.id,
      slug: "billing-fix",
      branch: "agent/billing-fix",
    });
    expect(manager.listEvents()[0]).toMatchObject({
      type: "workspace.created",
      workspaceId: workspace.id,
    });
  });

  it("restores persisted workspaces on startup", async () => {
    const root = createTempDir();
    const firstGit = createFakeGitDriver();
    const first = createDeterministicManager(root, firstGit.driver);
    const created = await first.manager.create({
      slug: "checkout-redesign",
      repoPath: first.repoPath,
      baseBranch: "main",
    });

    const secondGit = createFakeGitDriver();
    const second = createDeterministicManager(root, secondGit.driver);
    const restored = second.manager.get(created.id);
    const restoredEvent = second
      .manager
      .listEvents(created.id)
      .find((event) => event.type === "workspace.restored");

    expect(restored).not.toBeNull();
    expect(restored?.slug).toBe("checkout-redesign");
    expect(secondGit.addCalls).toHaveLength(0);
    expect(restoredEvent).toMatchObject({
      type: "workspace.restored",
    });
  });

  it("archives a workspace by removing its worktree and keeping metadata", async () => {
    const root = createTempDir();
    const git = createFakeGitDriver();
    const { manager, repoPath } = createDeterministicManager(root, git.driver);
    const workspace = await manager.create({
      slug: "auth-fix",
      repoPath,
      baseBranch: "main",
    });

    const archived = await manager.archive(workspace.id);
    const archivedEvent = manager
      .listEvents(workspace.id)
      .find((event) => event.type === "workspace.archived");

    expect(archived.status).toBe("archived");
    expect(archived.archivedAt).toBe("2026-03-07T03:07:31.000Z");
    expect(existsSync(workspace.worktreePath!)).toBe(false);
    expect(git.removeCalls).toHaveLength(1);
    expect(archivedEvent).toMatchObject({
      type: "workspace.archived",
    });
  });

  it("requires archived state before deleting a workspace", async () => {
    const root = createTempDir();
    const git = createFakeGitDriver();
    const { manager, repoPath } = createDeterministicManager(root, git.driver);
    const workspace = await manager.create({
      slug: "runtime-audit",
      repoPath,
      baseBranch: "main",
    });

    await expect(
      manager.delete(workspace.id, {
        confirm: true,
        deleteBranch: false,
      }),
    ).rejects.toBeInstanceOf(WorkspaceLifecycleError);
  });

  it("deletes archived workspaces only after explicit confirmation", async () => {
    const root = createTempDir();
    const git = createFakeGitDriver();
    const { manager, repoPath } = createDeterministicManager(root, git.driver);
    const workspace = await manager.create({
      slug: "port-routing",
      repoPath,
      baseBranch: "main",
    });

    await manager.archive(workspace.id);
    const deletion = await manager.delete(workspace.id, {
      confirm: true,
      deleteBranch: true,
    });
    const deletedEvent = manager
      .listEvents()
      .find((event) => event.type === "workspace.deleted");

    expect(deletion).toMatchObject({
      workspaceId: workspace.id,
      deletedBranch: true,
    });
    expect(manager.get(workspace.id)).toBeNull();
    expect(git.deleteBranchCalls).toHaveLength(1);
    expect(existsSync(workspace.artifacts.root)).toBe(false);
    expect(deletedEvent).toMatchObject({
      type: "workspace.deleted",
      workspaceId: workspace.id,
    });
  });
});
