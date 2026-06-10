"use client";

import { useTranslations } from "next-intl";
import { PropertyForm } from "@/components/PropertyForm";
import { PageHeader } from "@/components/ui";

export default function NewPropertyPage() {
  const t = useTranslations("properties");
  return (
    <main className="mx-auto max-w-xl p-4">
      <PageHeader title={t("add")} />
      <PropertyForm />
    </main>
  );
}
