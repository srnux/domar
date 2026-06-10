"use client";

import { useTranslations } from "next-intl";
import { useLogout, useMe } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const t = useTranslations("supervisor");
  const { data: me } = useMe();
  const logout = useLogout();
  const router = useRouter();

  return (
    <main className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <button
          onClick={() =>
            logout.mutate(undefined, {
              onSettled: () => router.replace("/login"),
            })
          }
          className="text-sm text-neutral-500 underline"
        >
          {t("signOut")}
        </button>
      </div>
      <p className="text-neutral-500">
        {t("greeting", { name: me?.name ?? "" })}
      </p>
    </main>
  );
}
