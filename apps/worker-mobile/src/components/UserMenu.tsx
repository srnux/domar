"use client";

import { useMe } from "@/lib/auth";
import { GuardedLink } from "@/components/GuardedLink";
import { UserAvatar } from "@/components/ui";

/**
 * The signed-in user's avatar, shown top-right in every layout. Links to the
 * self-service profile page; the name appears in a tooltip on hover.
 */
export function UserMenu() {
  const { data: me } = useMe();
  if (!me) return null;

  return (
    <GuardedLink
      href="/profile"
      title={me.name}
      aria-label={me.name}
      className="group relative shrink-0 rounded-full outline-none ring-accent focus-visible:ring-2"
    >
      <UserAvatar
        user={me}
        size={32}
        className="ring-2 ring-transparent transition group-hover:ring-border-strong"
      />
      <span className="pointer-events-none absolute right-0 top-full z-50 mt-1.5 hidden whitespace-nowrap rounded-md bg-fg px-2 py-1 text-xs font-medium text-bg shadow-md group-hover:block">
        {me.name}
      </span>
    </GuardedLink>
  );
}
