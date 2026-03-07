export function createRuntimeExecutorBoundary() {
  return {
    name: "runtime-executor",
    note: "Reserved for container boot, env injection, and preview health reporting.",
    status: "placeholder",
  } as const;
}
