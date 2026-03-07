export function createWorkspaceManagerBoundary() {
  return {
    name: "workspace-manager",
    note: "Reserved for git worktree lifecycle and durable workspace metadata.",
    status: "placeholder",
  } as const;
}
