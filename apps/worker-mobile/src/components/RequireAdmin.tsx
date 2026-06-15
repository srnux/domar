"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor, useMe } from "@/lib/auth";
import { PageSpinner } from "@/components/ui";

/**
 * Client-side gate for the platform-admin area. The API enforces the
 * PlatformAdminGuard on every /admin call — this only routes people correctly.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me, isPending, isError } = useMe();

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    } else if (me && !me.isPlatformAdmin) {
      router.replace(homeFor(me));
    }
  }, [isError, me, router]);

  if (isPending || isError || !me || !me.isPlatformAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <PageSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
