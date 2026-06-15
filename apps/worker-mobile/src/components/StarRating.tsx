"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/components/ui";

const STARS = [1, 2, 3, 4, 5] as const;

/**
 * Interactive 1–5 star input. `value` is the current score (0 = none);
 * `onChange` fires with the clicked star. Hover previews the prospective score.
 */
export function StarRating({
  value,
  onChange,
  disabled = false,
  size = 28,
}: {
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {STARS.map((star) => {
        const filled = star <= shown;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
            aria-pressed={star <= value}
            onMouseEnter={() => !disabled && setHover(star)}
            onClick={() => !disabled && onChange(star)}
            className={cn(
              "rounded transition-transform",
              !disabled && "hover:scale-110 cursor-pointer",
              disabled && "cursor-default",
            )}
          >
            <Star
              size={size}
              className={
                filled ? "text-amber-400" : "text-border-strong"
              }
              fill={filled ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Read-only star display for an average score (e.g. 4.3). Fills whole stars
 * up to the rounded value; intended for compact list rows.
 */
export function StarDisplay({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {STARS.map((star) => {
        const filled = star <= rounded;
        return (
          <Star
            key={star}
            size={size}
            className={filled ? "text-amber-400" : "text-border-strong"}
            fill={filled ? "currentColor" : "none"}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
