import { cn } from "./cn";

export type CalloutVariant =
  | "info"
  | "warning"
  | "success"
  | "access"
  | "declined"
  | "neutral";

const VARIANTS: Record<CalloutVariant, string> = {
  info: "bg-info-soft border-info-line text-info-fg",
  warning: "bg-warn-bg border-warn-line text-warn-fg",
  success: "bg-accent-soft border-accent-line text-accent-fg",
  access: "bg-access-bg border-access-line text-access-fg",
  declined: "bg-st-declined-soft border-st-declined/30 text-st-declined",
  neutral: "bg-surface-2 border-border text-fg-soft",
};

/**
 * Tinted message block. `icon` and `title` are optional; `children` is the body.
 * Used for access notes, assignment info, warnings, success and decline states.
 */
export function Callout({
  variant = "info",
  icon,
  title,
  className,
  children,
}: {
  variant?: CalloutVariant;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          {title && <p className="mb-0.5 font-semibold">{title}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
