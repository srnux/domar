"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigationBlocker } from "@/components/navigation-blocker";

/**
 * Drop-in replacement for `next/link` that routes client-side navigation
 * through the navigation blocker. Outside a `NavigationBlockerProvider` the
 * default context never blocks, so it behaves exactly like `Link`.
 */
export function GuardedLink({
  onNavigate,
  ...props
}: React.ComponentProps<typeof Link>) {
  const { isBlocked, guard } = useNavigationBlocker();
  const router = useRouter();
  return (
    <Link
      {...props}
      onNavigate={(e) => {
        onNavigate?.(e);
        if (!isBlocked) return;
        e.preventDefault();
        guard(() => router.push(String(props.href)));
      }}
    />
  );
}

/** Programmatic navigation routed through the navigation blocker. */
export function useGuardedRouter() {
  const router = useRouter();
  const { guard } = useNavigationBlocker();
  return {
    push: (href: string) => guard(() => router.push(href)),
    replace: (href: string) => guard(() => router.replace(href)),
  };
}
