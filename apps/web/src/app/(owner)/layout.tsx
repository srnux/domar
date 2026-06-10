"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { RequireRole } from "@/components/RequireRole";
import { useLogout } from "@/lib/auth";
import { Brand } from "@/components/ui";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("owner");
  const logout = useLogout();
  const router = useRouter();

  return (
    <RequireRole role="OWNER">
      <div className="min-h-screen bg-bg">
        <header className="dom-frost sticky top-0 z-40 border-b border-border">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/properties">
              <Brand size={22} />
            </Link>
            <button
              onClick={() =>
                logout.mutate(undefined, {
                  onSettled: () => router.replace("/login"),
                })
              }
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
            >
              <LogOut size={15} aria-hidden />
              {t("signOut")}
            </button>
          </div>
        </header>
        {children}
      </div>
    </RequireRole>
  );
}
