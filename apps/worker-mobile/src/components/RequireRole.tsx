"use client";

import type { Role } from "@domar/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMe } from "@/lib/auth";
import { PageSpinner } from "@/components/ui";

/**
 * Client-side gate for a role-scoped area. The server enforces permissions
 * for real on every API call — this only routes people to the right place.
 */
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: me, isPending, isError } = useMe();

  useEffect(() => {
    // Worker-only app: a non-worker (or no) session goes back to login rather
    // than to web-only routes that don't exist here.
    if (isError || (me && me.role !== role)) {
      router.replace("/login");
    }
  }, [isError, me, role, router]);

  if (isPending || isError || !me || me.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <PageSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
