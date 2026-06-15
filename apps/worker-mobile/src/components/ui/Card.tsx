import { cn } from "./cn";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("dom-card", className)} {...rest}>
      {children}
    </div>
  );
}

/** Card header with a title and optional trailing action / link. */
export function CardHeader({
  title,
  count,
  action,
  className,
}: {
  title: React.ReactNode;
  count?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-border px-4 py-3.5",
        className,
      )}
    >
      <h2 className="flex items-baseline gap-2 text-base font-semibold text-fg">
        {title}
        {count != null && (
          <span className="text-xs font-normal tabular-nums text-muted">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}
