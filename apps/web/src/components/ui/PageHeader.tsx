import { cn } from "./cn";

/** Standard page title row: heading + optional eyebrow, subtitle and trailing action. */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  /** Breadcrumb-style line above the title, prefixed with an accent dot. */
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 flex items-center gap-1.5 text-sm text-muted">
            <span
              className="size-1 shrink-0 rounded-full bg-accent"
              aria-hidden
            />
            <span className="truncate">{eyebrow}</span>
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
