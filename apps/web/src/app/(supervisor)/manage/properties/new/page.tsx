"use client";

import { useTranslations } from "next-intl";
import { PropertyForm } from "@/components/PropertyForm";

export default function NewPropertyPage() {
  const t = useTranslations("properties");
  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{t("add")}</h1>
      <PropertyForm />
    </main>
  );
}
