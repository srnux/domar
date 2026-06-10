"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RequireRole } from "@/components/RequireRole";
import { useLogout } from "@/lib/auth";

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
      <div className="min-h-screen bg-neutral-50">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
          <Link href="/properties" className="font-bold">
            Domar
          </Link>
          <button
            onClick={() =>
              logout.mutate(undefined, {
                onSettled: () => router.replace("/login"),
              })
            }
            className="text-sm text-neutral-400 underline"
          >
            {t("signOut")}
          </button>
        </header>
        {children}
      </div>
    </RequireRole>
  );
}
