import { cn } from "./cn";

export function Spinner({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-border-strong border-t-accent",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

/** Centered branded loading state for full-page waits. */
export function PageSpinner() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Spinner size={28} />
    </div>
  );
}
