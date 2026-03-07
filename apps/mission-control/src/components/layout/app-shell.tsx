import Link from "next/link";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AppShell({ children, breadcrumbs }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] font-mono text-sm font-bold text-[var(--color-canvas)]">
              T
            </div>
            <span className="font-mono text-sm font-semibold text-[var(--color-ink)]">
              TakomiDX
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:inline-flex"
            >
              Workspaces
            </Link>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-ink-faint)]">
              <span className="mr-1 text-[var(--color-primary)]">●</span>
              agentd
            </div>
          </div>
        </div>
      </nav>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-3 lg:px-6">
          <nav className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-ink-faint)]">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.label} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-[var(--color-border-bright)]">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-[var(--color-primary)]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--color-ink-muted)]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      )}

      <main className="w-full flex-1 pb-10">{children}</main>
    </div>
  );
}
