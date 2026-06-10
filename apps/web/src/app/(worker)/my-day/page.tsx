"use client";

import { useTranslations } from "next-intl";
import { useMe } from "@/lib/auth";

export default function MyDayPage() {
  const t = useTranslations("worker");
  const { data: me } = useMe();

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">{t("myDay")}</h1>
      <p className="text-neutral-500">
        {t("greeting", { name: me?.name ?? "" })}
      </p>
    </main>
  );
}
