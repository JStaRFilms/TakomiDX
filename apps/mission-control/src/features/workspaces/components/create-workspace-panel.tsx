"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

interface CreateWorkspacePanelProps {
  defaultRepoPath?: string;
}

interface CreateWorkspaceResponse {
  id: string;
  slug: string;
}

function isCreateWorkspaceResponse(
  value: CreateWorkspaceResponse | { message?: string },
): value is CreateWorkspaceResponse {
  return "id" in value && "slug" in value;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function CreateWorkspacePanel({
  defaultRepoPath = "",
}: CreateWorkspacePanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repoPath, setRepoPath] = useState(defaultRepoPath);
  const [slug, setSlug] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const trimmedSlug = slugify(slug);
    const trimmedRepoPath = repoPath.trim();
    const trimmedBaseBranch = baseBranch.trim() || "main";

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: trimmedSlug,
          repoPath: trimmedRepoPath,
          baseBranch: trimmedBaseBranch,
          branchType: "agent",
          runtimeType: "container",
        }),
      });
      const payload = (await response.json()) as
        | CreateWorkspaceResponse
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && typeof payload.message === "string"
            ? payload.message
            : "Workspace creation failed.",
        );
      }

      if (!isCreateWorkspaceResponse(payload)) {
        throw new Error("Workspace creation returned an unexpected response.");
      }

      setMessage(`Created ${payload.slug}. Refreshing workspace grid...`);
      setOpen(false);
      // Clear message after refresh burst completes (15s max delay from scheduleRefreshBurst)
      setTimeout(() => {
        setMessage(null);
      }, 16000);
      startTransition(() => {
        router.refresh();
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Workspace creation failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Create Workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
            Create a real workspace from this dashboard. On Windows, paste a full path like
            <span className="ml-1 font-mono text-[var(--color-ink)]">
              C:\CreativeOS\01_Projects\Code\YourRepo
            </span>
            .
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setError(null);
            setMessage(null);
          }}
          className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-2 font-mono text-sm font-semibold text-[var(--color-canvas)] transition-colors hover:bg-[var(--color-primary-dim)]"
        >
          {open ? "Hide Form" : "New Workspace"}
        </button>
      </div>

      {(message || error) && (
        <div
          className={`mt-4 rounded-lg border px-3 py-3 text-sm ${error
              ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/8 text-[var(--color-danger)]"
              : "border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 text-[var(--color-ink)]"
            }`}
        >
          {error ?? message}
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
              Workspace Slug
            </span>
            <input
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              placeholder="demo-preview"
              required
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
              Base Branch
            </span>
            <input
              value={baseBranch}
              onChange={(event) => setBaseBranch(event.target.value)}
              placeholder="main"
              required
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="font-mono text-[11px] uppercase text-[var(--color-ink-faint)]">
              Repo Path
            </span>
            <input
              value={repoPath}
              onChange={(event) => setRepoPath(event.target.value)}
              placeholder="C:\CreativeOS\01_Projects\Code\Personal_Stuff\2026-03-07_TakomiUX"
              required
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
            />
          </label>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3 text-sm leading-6 text-[var(--color-ink-muted)] lg:col-span-2">
            This creates an <span className="font-mono text-[var(--color-ink)]">agent</span>{" "}
            worktree with the <span className="font-mono text-[var(--color-ink)]">container</span>{" "}
            runtime. After creation, the dashboard refreshes and you can open the workspace detail
            screen immediately.
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-2 font-mono text-sm font-semibold text-[var(--color-canvas)] transition-colors hover:bg-[var(--color-primary-dim)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Workspace"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono text-sm text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
