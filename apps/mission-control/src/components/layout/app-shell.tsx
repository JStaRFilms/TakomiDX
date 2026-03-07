import Link from "next/link";
import type { ReactNode } from "react";

interface AppShellProps {
  aside?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export function AppShell({
  aside,
  children,
  description,
  eyebrow,
  title,
}: AppShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-6 lg:px-8">
      <header className="grid gap-4 rounded-[36px] border border-[color:var(--color-line)] bg-[color:var(--color-panel)] p-6 shadow-[10px_10px_0_0_var(--color-line)] lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-black/60">
            <span>{eyebrow}</span>
            <span className="rounded-full border border-[color:var(--color-line)] px-3 py-1 text-black">
              MVP Foundation
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-black/70">
              {description}
            </p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link
              className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-accent)] px-4 py-2 font-semibold text-white"
              href="/"
            >
              Workspace Grid
            </Link>
            <span className="rounded-full border border-dashed border-[color:var(--color-line)] px-4 py-2 text-black/60">
              Detail routes locked for downstream tasks
            </span>
          </nav>
        </div>
        <div className="grid gap-4">{aside}</div>
      </header>
      <div className="grid gap-4">{children}</div>
    </main>
  );
}
