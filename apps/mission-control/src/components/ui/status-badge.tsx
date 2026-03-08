import type { WorkspaceSummary } from "@takomi/contracts";

interface StatusBadgeProps {
  status: WorkspaceSummary["status"] | "stopped";
  className?: string;
}

const statusConfig: Record<
  WorkspaceSummary["status"] | "stopped",
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    dotBg: string;
    pulse?: boolean;
    glow?: boolean;
  }
> = {
  running: {
    label: "running",
    bg: "bg-[var(--color-primary)]/10",
    border: "border-[var(--color-primary)]/20",
    text: "text-[var(--color-primary)]",
    dotBg: "bg-[var(--color-primary)]",
    pulse: true,
    glow: true,
  },
  queued: {
    label: "queued",
    bg: "bg-[var(--color-ink-faint)]/10",
    border: "border-[var(--color-ink-faint)]/20",
    text: "text-[var(--color-ink-muted)]",
    dotBg: "bg-[var(--color-ink-muted)]",
  },
  booting: {
    label: "booting",
    bg: "bg-[var(--color-accent)]/10",
    border: "border-[var(--color-accent)]/20",
    text: "text-[var(--color-accent)]",
    dotBg: "bg-[var(--color-accent)]",
    pulse: true,
  },
  awaiting_human: {
    label: "awaiting",
    bg: "bg-[var(--color-warning)]/10",
    border: "border-[var(--color-warning)]/20",
    text: "text-[var(--color-warning)]",
    dotBg: "bg-[var(--color-warning)]",
    pulse: true,
  },
  failed: {
    label: "failed",
    bg: "bg-[var(--color-danger)]/10",
    border: "border-[var(--color-danger)]/25",
    text: "text-[var(--color-danger)]",
    dotBg: "bg-[var(--color-danger)]",
  },
  completed: {
    label: "complete",
    bg: "bg-[var(--color-success)]/10",
    border: "border-[var(--color-success)]/15",
    text: "text-[var(--color-success)]",
    dotBg: "bg-[var(--color-success)]",
  },
  validating: {
    label: "validating",
    bg: "bg-[var(--color-accent)]/10",
    border: "border-[var(--color-accent)]/20",
    text: "text-[var(--color-accent)]",
    dotBg: "bg-[var(--color-accent)]",
    pulse: true,
  },
  archived: {
    label: "archived",
    bg: "bg-[var(--color-surface-2)]",
    border: "border-[var(--color-border)]",
    text: "text-[var(--color-ink-faint)]",
    dotBg: "bg-[var(--color-border-bright)]",
  },
  stopped: {
    label: "stopped",
    bg: "bg-[var(--color-warning)]/10",
    border: "border-[var(--color-warning)]/20",
    text: "text-[var(--color-warning)]",
    dotBg: "bg-[var(--color-warning)]",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-medium ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dotBg} ${config.pulse ? "animate-pulse" : ""} ${
          config.glow ? "shadow-[0_0_8px_var(--color-primary)]" : ""
        }`}
      />
      {config.label}
    </span>
  );
}
