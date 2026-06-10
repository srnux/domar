"use client";

import { useTranslations } from "next-intl";

export default function OwnerPropertiesPage() {
  const t = useTranslations("owner");

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">{t("myProperties")}</h1>
    </main>
  );
}
