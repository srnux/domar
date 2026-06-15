"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { RequireAdmin } from "@/components/RequireAdmin";
import { useLogout } from "@/lib/auth";
import { Brand } from "@/components/ui";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logout = useLogout();
  const router = useRouter();
  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => router.replace("/login") });

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-bg">
        <header className="dom-frost sticky top-0 z-40 border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <Brand size={22} />
            <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-fg">
              Platform Admin
            </span>
            <button
              onClick={signOut}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-subtle hover:bg-surface-2 hover:text-fg"
            >
              <LogOut size={15} aria-hidden />
              Sign out
            </button>
          </div>
        </header>
        {children}
      </div>
    </RequireAdmin>
  );
}
