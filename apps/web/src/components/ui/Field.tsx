import { forwardRef } from "react";
import { cn } from "./cn";

const CONTROL =
  "w-full rounded-md border border-border-strong bg-surface text-fg " +
  "px-3 py-2.5 text-base leading-snug placeholder:text-subtle " +
  "transition-[border-color,box-shadow] duration-[120ms] ease-domar outline-none " +
  "focus-visible:border-accent-line focus-visible:shadow-[0_0_0_3px_var(--color-accent-soft)] " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(CONTROL, className)} {...rest} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea ref={ref} className={cn(CONTROL, "resize-y", className)} {...rest} />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(CONTROL, "appearance-none bg-no-repeat pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%237a8290' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 10px center",
      }}
      {...rest}
    />
  );
});

/** Vertical label + control group. */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-sm font-medium text-fg-soft">{label}</span>
      )}
      {children}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="text-xs font-medium text-st-declined">
          {error}
        </span>
      )}
    </label>
  );
}
