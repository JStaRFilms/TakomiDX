import {
  createPreviewHost,
  createWorkspaceBranchName,
  createWorkspaceInputSchema,
  deleteWorkspaceInputSchema,
  workspaceLifecycleEventSchema,
  workspaceMetadataSchema,
  type CreateWorkspaceInput,
  type DeleteWorkspaceInput,
  type WorkspaceLifecycleEvent,
  type WorkspaceLifecycleEventType,
  type WorkspaceMetadata,
} from "@takomi/contracts";
import { spawn } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export interface GitWorktreeCreateInput {
  repoPath: string;
  worktreePath: string;
  branch: string;
  baseBranch: string;
}

export interface GitWorktreeRemoveInput {
  repoPath: string;
  worktreePath: string;
}

export interface GitWorktreeDeleteBranchInput {
  repoPath: string;
  branch: string;
}

export interface GitWorktreeDriver {
  add(input: GitWorktreeCreateInput): Promise<void>;
  remove(input: GitWorktreeRemoveInput): Promise<void>;
  deleteBranch(input: GitWorktreeDeleteBranchInput): Promise<void>;
}

export interface DeleteWorkspaceResult {
  workspaceId: string;
  deletedBranch: boolean;
}

export interface CreateWorkspaceManagerOptions {
  previewDomain: string;
  stateDir: string;
  workspacesDir: string;
  worktreeRootDir: string;
  gitDriver?: GitWorktreeDriver;
  now?: () => Date;
  idGenerator?: () => string;
  eventIdGenerator?: () => string;
  onEvent?: (event: WorkspaceLifecycleEvent) => void;
}

export class WorkspaceLifecycleError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "workspace_not_found"
      | "workspace_conflict"
      | "workspace_delete_confirmation_required"
      | "workspace_delete_requires_archive"
      | "workspace_git_error",
    public readonly status: number,
  ) {
    super(message);
    this.name = "WorkspaceLifecycleError";
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function appendJsonLine(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, JSON.stringify(value) + "\n", "utf8");
}

function readJsonLines<T>(filePath: string): T[] {
  if (!existsSync(filePath)) {
    return [];
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function runGitCommand(repoPath: string, args: string[]) {
  const child = spawn("git", ["-C", repoPath, ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || stdout.trim() || "Git command failed.");
  }
}

function isWindowsPathLengthError(error: unknown) {
  if (process.platform !== "win32") {
    return false;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    "code" in error && error.code === "ENAMETOOLONG" ||
    error.message.includes("Filename too long") ||
    error.message.includes("ENAMETOOLONG")
  );
}

function toLongPath(filePath: string) {
  if (process.platform !== "win32") {
    return filePath;
  }

  const normalized = path.resolve(filePath).replace(/\//g, "\\");
  return normalized.startsWith("\\\\?\\") ? normalized : `\\\\?\\${normalized}`;
}

function removeDirectoryTree(filePath: string) {
  rmSync(toLongPath(filePath), {
    force: true,
    recursive: true,
    maxRetries: 3,
    retryDelay: 50,
  });
}

export function createGitWorktreeDriver(): GitWorktreeDriver {
  return {
    async add(input) {
      await runGitCommand(input.repoPath, [
        "worktree",
        "add",
        input.worktreePath,
        "-b",
        input.branch,
        input.baseBranch,
      ]);
    },

    async remove(input) {
      try {
        await runGitCommand(input.repoPath, [
          "worktree",
          "remove",
          input.worktreePath,
          "--force",
        ]);
      } catch (error) {
        if (!isWindowsPathLengthError(error) || !existsSync(input.worktreePath)) {
          throw error;
        }

        removeDirectoryTree(input.worktreePath);
        await runGitCommand(input.repoPath, ["worktree", "prune"]);
      }
    },

    async deleteBranch(input) {
      await runGitCommand(input.repoPath, [
        "branch",
        "--delete",
        "--force",
        input.branch,
      ]);
    },
  };
}

function createIdentifier(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

export function createWorkspaceManager(options: CreateWorkspaceManagerOptions) {
  const gitDriver = options.gitDriver ?? createGitWorktreeDriver();
  const now = options.now ?? (() => new Date());
  const idGenerator = options.idGenerator ?? (() => createIdentifier("ws"));
  const eventIdGenerator =
    options.eventIdGenerator ?? (() => createIdentifier("evt"));
  const workspaces = new Map<string, WorkspaceMetadata>();
  const events = readJsonLines<WorkspaceLifecycleEvent>(
    path.join(options.stateDir, "workspace-events.jsonl"),
  ).map((event) => workspaceLifecycleEventSchema.parse(event));

  function getWorkspaceDir(workspaceId: string) {
    return path.join(options.workspacesDir, workspaceId);
  }

  function getWorkspaceMetaPath(workspaceId: string) {
    return path.join(getWorkspaceDir(workspaceId), "meta.json");
  }

  function getWorkspaceEventsPath() {
    return path.join(options.stateDir, "workspace-events.jsonl");
  }

  function persistWorkspace(workspace: WorkspaceMetadata) {
    writeJsonFile(getWorkspaceMetaPath(workspace.id), workspace);
    workspaces.set(workspace.id, workspace);
  }

  function emitEvent(
    workspace: WorkspaceMetadata,
    type: WorkspaceLifecycleEventType,
    summary: string,
    detail: string | null = null,
  ) {
    const event = workspaceLifecycleEventSchema.parse({
      id: eventIdGenerator(),
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      type,
      status: workspace.status,
      timestamp: now().toISOString(),
      summary,
      detail,
    });

    appendJsonLine(getWorkspaceEventsPath(), event);
    events.push(event);
    options.onEvent?.(event);
    return event;
  }

  function listPersistedWorkspaceIds() {
    mkdirSync(options.workspacesDir, { recursive: true });

    return readdirSync(options.workspacesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }

  function buildArtifactLayout(workspaceId: string) {
    const root = getWorkspaceDir(workspaceId);

    return {
      root,
      logsDir: path.join(root, "logs"),
      tracesDir: path.join(root, "traces"),
      reviewDir: path.join(root, "review"),
      browserDir: path.join(root, "browser"),
    };
  }

  function ensureArtifactDirectories(workspaceId: string) {
    const artifacts = buildArtifactLayout(workspaceId);

    for (const directory of Object.values(artifacts)) {
      mkdirSync(directory, { recursive: true });
    }

    return artifacts;
  }

  function updateWorkspaceFailure(workspace: WorkspaceMetadata, message: string) {
    const nextWorkspace = workspaceMetadataSchema.parse({
      ...workspace,
      updatedAt: now().toISOString(),
      lastError: message,
    });

    persistWorkspace(nextWorkspace);
    return nextWorkspace;
  }

  function getWorkspaceOrThrow(workspaceId: string) {
    const workspace = workspaces.get(workspaceId);

    if (!workspace) {
      throw new WorkspaceLifecycleError(
        `No workspace is registered for ${workspaceId}.`,
        "workspace_not_found",
        404,
      );
    }

    return workspace;
  }

  function assertSlugAvailable(slug: string) {
    const conflict = Array.from(workspaces.values()).find(
      (workspace) => workspace.slug === slug,
    );

    if (conflict) {
      throw new WorkspaceLifecycleError(
        `Workspace slug "${slug}" is already in use by ${conflict.id}.`,
        "workspace_conflict",
        409,
      );
    }
  }

  function restorePersistedWorkspaces() {
    mkdirSync(options.stateDir, { recursive: true });
    mkdirSync(options.worktreeRootDir, { recursive: true });

    for (const workspaceId of listPersistedWorkspaceIds()) {
      const metaPath = getWorkspaceMetaPath(workspaceId);

      if (!existsSync(metaPath)) {
        continue;
      }

      const persisted = workspaceMetadataSchema.parse(
        JSON.parse(readFileSync(metaPath, "utf8")),
      );
      const missingWorktree =
        persisted.status !== "archived" &&
        persisted.worktreePath !== null &&
        !existsSync(persisted.worktreePath);

      const restored = workspaceMetadataSchema.parse({
        ...persisted,
        status: missingWorktree ? "failed" : persisted.status,
        updatedAt: missingWorktree ? now().toISOString() : persisted.updatedAt,
        lastError: missingWorktree
          ? "Worktree path is missing during restore."
          : persisted.lastError,
        artifacts: ensureArtifactDirectories(workspaceId),
      });

      persistWorkspace(restored);
      emitEvent(
        restored,
        missingWorktree ? "workspace.restore_failed" : "workspace.restored",
        missingWorktree
          ? `Workspace ${restored.slug} restored without its worktree.`
          : `Workspace ${restored.slug} restored from disk.`,
        missingWorktree ? restored.lastError : null,
      );
    }
  }

  restorePersistedWorkspaces();

  return {
    async create(input: CreateWorkspaceInput) {
      const request = createWorkspaceInputSchema.parse(input);
      assertSlugAvailable(request.slug);

      const workspaceId = idGenerator();
      const timestamp = now().toISOString();
      const branch = createWorkspaceBranchName(request.branchType, request.slug);
      const worktreePath = path.join(options.worktreeRootDir, workspaceId);

      try {
        await gitDriver.add({
          repoPath: request.repoPath,
          worktreePath,
          branch,
          baseBranch: request.baseBranch,
        });
      } catch (error) {
        throw new WorkspaceLifecycleError(
          error instanceof Error
            ? error.message
            : "Git failed to provision the worktree.",
          "workspace_git_error",
          500,
        );
      }

      const workspace = workspaceMetadataSchema.parse({
        id: workspaceId,
        slug: request.slug,
        repoPath: request.repoPath,
        worktreePath,
        branch,
        baseBranch: request.baseBranch,
        branchType: request.branchType,
        runtimeType: request.runtimeType,
        previewHost: createPreviewHost(request.slug, options.previewDomain),
        status: "queued",
        createdAt: timestamp,
        updatedAt: timestamp,
        archivedAt: null,
        lastError: null,
        artifacts: ensureArtifactDirectories(workspaceId),
      });

      persistWorkspace(workspace);
      emitEvent(
        workspace,
        "workspace.created",
        `Workspace ${workspace.slug} created with branch ${workspace.branch}.`,
      );
      return workspace;
    },

    async archive(workspaceId: string) {
      const workspace = getWorkspaceOrThrow(workspaceId);

      if (workspace.status === "archived") {
        return workspace;
      }

      if (workspace.worktreePath && existsSync(workspace.worktreePath)) {
        try {
          await gitDriver.remove({
            repoPath: workspace.repoPath,
            worktreePath: workspace.worktreePath,
          });
        } catch (error) {
          const failedWorkspace = updateWorkspaceFailure(
            workspace,
            error instanceof Error
              ? error.message
              : "Git failed to remove the worktree.",
          );

          throw new WorkspaceLifecycleError(
            failedWorkspace.lastError ?? "Git failed to remove the worktree.",
            "workspace_git_error",
            500,
          );
        }
      }

      const archivedWorkspace = workspaceMetadataSchema.parse({
        ...workspace,
        status: "archived",
        archivedAt: now().toISOString(),
        updatedAt: now().toISOString(),
        lastError: null,
      });

      persistWorkspace(archivedWorkspace);
      emitEvent(
        archivedWorkspace,
        "workspace.archived",
        `Workspace ${archivedWorkspace.slug} archived safely.`,
      );
      return archivedWorkspace;
    },

    async delete(workspaceId: string, input: DeleteWorkspaceInput) {
      const request = deleteWorkspaceInputSchema.parse(input);

      if (!request.confirm) {
        throw new WorkspaceLifecycleError(
          "Deletion requires explicit confirmation.",
          "workspace_delete_confirmation_required",
          400,
        );
      }

      const workspace = getWorkspaceOrThrow(workspaceId);

      if (workspace.status !== "archived") {
        throw new WorkspaceLifecycleError(
          "Only archived workspaces can be deleted.",
          "workspace_delete_requires_archive",
          409,
        );
      }

      if (workspace.worktreePath && existsSync(workspace.worktreePath)) {
        try {
          await gitDriver.remove({
            repoPath: workspace.repoPath,
            worktreePath: workspace.worktreePath,
          });
        } catch (error) {
          const failedWorkspace = updateWorkspaceFailure(
            workspace,
            error instanceof Error
              ? error.message
              : "Git failed to remove the worktree during delete.",
          );

          throw new WorkspaceLifecycleError(
            failedWorkspace.lastError ??
              "Git failed to remove the worktree during delete.",
            "workspace_git_error",
            500,
          );
        }
      }

      if (request.deleteBranch) {
        try {
          await gitDriver.deleteBranch({
            repoPath: workspace.repoPath,
            branch: workspace.branch,
          });
        } catch (error) {
          const failedWorkspace = updateWorkspaceFailure(
            workspace,
            error instanceof Error
              ? error.message
              : "Git failed to delete the workspace branch.",
          );

          throw new WorkspaceLifecycleError(
            failedWorkspace.lastError ??
              "Git failed to delete the workspace branch.",
            "workspace_git_error",
            500,
          );
        }
      }

      emitEvent(
        workspace,
        "workspace.deleted",
        `Workspace ${workspace.slug} deleted from local metadata.`,
      );
      rmSync(getWorkspaceDir(workspaceId), {
        force: true,
        recursive: true,
      });
      workspaces.delete(workspaceId);

      return {
        workspaceId,
        deletedBranch: request.deleteBranch,
      } satisfies DeleteWorkspaceResult;
    },

    get(workspaceId: string) {
      return workspaces.get(workspaceId) ?? null;
    },

    list() {
      return Array.from(workspaces.values()).sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
    },

    listEvents(workspaceId?: string) {
      const filtered = workspaceId
        ? events.filter((event) => event.workspaceId === workspaceId)
        : events;

      return [...filtered].sort((left, right) =>
        right.timestamp.localeCompare(left.timestamp),
      );
    },
  };
}

export type WorkspaceManager = ReturnType<typeof createWorkspaceManager>;

export function createWorkspaceManagerBoundary(
  workspaceCount: number = 0,
  eventCount: number = 0,
) {
  return {
    name: "workspace-manager",
    note: "Owns durable workspace metadata, worktree provisioning, and lifecycle events.",
    status: "ready",
    activeWorkspaces: workspaceCount,
    eventCount,
  } as const;
}
