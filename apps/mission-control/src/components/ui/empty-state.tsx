import type { ReactNode } from "react";

interface EmptyStateProps {
    icon?: string | ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
}

export function EmptyState({
    icon = ">_",
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--color-border-bright)] bg-[var(--color-surface)] py-16 px-6 text-center">
            <div className="mb-4 font-mono text-4xl text-[var(--color-ink-faint)]">
                {icon}
            </div>
            <h3 className="mb-2 font-mono text-base font-semibold text-[var(--color-ink)]">
                {title}
            </h3>
            <p className="mx-auto max-w-[360px] text-sm text-[var(--color-ink-muted)]">
                {description}
            </p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
