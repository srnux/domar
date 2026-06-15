import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { useNavigate } from "react-router";

type NextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  replace?: boolean;
  prefetch?: boolean;
  scroll?: boolean;
  /** Next 15+ callback; receives an event whose preventDefault cancels nav. */
  onNavigate?: (e: { preventDefault: () => void }) => void;
};

/**
 * Drop-in replacement for `next/link` backed by react-router. Supports the
 * `onNavigate` hook that GuardedLink relies on, and lets the browser handle
 * modifier-clicks / new-tab as usual.
 */
export default function Link({
  href,
  replace,
  prefetch: _prefetch,
  scroll: _scroll,
  onNavigate,
  onClick,
  ...rest
}: NextLinkProps) {
  const navigate = useNavigate();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return; // let the browser open a new tab / window
    }
    e.preventDefault();
    let cancelled = false;
    onNavigate?.({
      preventDefault: () => {
        cancelled = true;
      },
    });
    if (cancelled) return;
    void navigate(href, { replace });
  }

  return <a href={href} onClick={handleClick} {...rest} />;
}
