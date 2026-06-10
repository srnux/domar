"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RequireRole } from "@/components/RequireRole";
import { useLogout } from "@/lib/auth";

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("supervisor");
  const logout = useLogout();
  const router = useRouter();

  return (
    <RequireRole role="SUPERVISOR">
      <div className="min-h-screen bg-neutral-50">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
          <Link href="/dashboard" className="font-bold">
            Domar
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-neutral-600">
              {t("dashboard")}
            </Link>
            <Link href="/jobs/new" className="text-neutral-600">
              {t("newJob")}
            </Link>
            <button
              onClick={() =>
                logout.mutate(undefined, {
                  onSettled: () => router.replace("/login"),
                })
              }
              className="text-neutral-400 underline"
            >
              {t("signOut")}
            </button>
          </nav>
        </header>
        {children}
      </div>
    </RequireRole>
  );
}
