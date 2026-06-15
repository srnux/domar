import { forwardRef } from "react";
import { cn } from "./cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "warning";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-colors duration-[120ms] ease-domar select-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white border border-accent-hover shadow-sm hover:bg-accent-hover",
  secondary:
    "bg-surface text-fg border border-border-strong hover:bg-surface-2",
  ghost: "bg-transparent text-muted hover:text-fg hover:bg-surface-2",
  danger:
    "bg-surface text-st-declined border border-st-declined/30 hover:bg-st-declined-soft",
  warning:
    "bg-st-progress text-white border border-st-progress/60 shadow-sm hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "text-xs px-2.5 py-1.5 rounded-sm",
  md: "text-sm px-3.5 py-2",
  // ≥44px touch target for worker flows
  lg: "text-base px-4 min-h-[48px] py-3",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

/** Shared class string so <Link> can be styled identically to <Button>. */
export function buttonClass({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClass({ variant, size, fullWidth, className })}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
          />
        )}
        {children}
      </button>
    );
  },
);
