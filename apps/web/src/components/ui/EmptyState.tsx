import { cn } from "./cn";

/** Calm "nothing here" placeholder used across lists. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-2/50 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <span className="grid size-11 place-items-center rounded-full bg-surface text-muted shadow-sm">
          {icon}
        </span>
      )}
      <p className="text-base font-medium text-fg-soft">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
