interface PlaceholderPanelProps {
  description: string;
  items: string[];
  title: string;
}

export function PlaceholderPanel({
  description,
  items,
  title,
}: PlaceholderPanelProps) {
  return (
    <section className="rounded-[28px] border border-[color:var(--color-line)] bg-[color:var(--color-panel)] p-5 shadow-[8px_8px_0_0_var(--color-line)]">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-black/60">
          Placeholder Boundary
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-black/70">
          {description}
        </p>
      </div>
      <ul className="mt-5 grid gap-3">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl border border-dashed border-[color:var(--color-line)] bg-white/50 px-4 py-3 text-sm"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
