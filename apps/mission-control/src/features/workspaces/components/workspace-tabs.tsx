"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface WorkspaceTabsProps {
  workspaceId: string;
}

const TABS = [
  { label: "Summary", path: "" },
  { label: "Activity", path: "/activity" },
  { label: "Logs", path: "/logs" },
  { label: "Trace", path: "/trace" },
  { label: "Preview", path: "/preview" },
  { label: "Diff", path: "/diff" },
  { label: "Validation", path: "/validation" },
];

export function WorkspaceTabs({ workspaceId }: WorkspaceTabsProps) {
  const pathname = usePathname();
  const basePath = `/workspaces/${workspaceId}`;

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-border)] px-1 pb-2">
      {TABS.map((tab) => {
        const fullPath = `${basePath}${tab.path}`;
        const isActive = pathname === fullPath;

        return (
          <Link
            key={tab.path}
            href={fullPath}
            className={`relative pb-2 font-mono text-xs transition-colors ${
              isActive
                ? "text-[var(--color-ink)]"
                : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-muted)]"
            }`}
          >
            {tab.label}
            {isActive && (
              <div className="absolute bottom-[-9px] left-0 h-[2px] w-full bg-[var(--color-primary)] glow-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
