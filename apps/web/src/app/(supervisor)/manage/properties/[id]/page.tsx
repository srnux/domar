"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@domar/shared";
import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import { PropertyForm } from "@/components/PropertyForm";

export default function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("properties");
  const { data: property, isPending } = useQuery<PropertyDto, ApiError>({
    queryKey: ["properties", id],
    queryFn: () => api(`/api/properties/${id}`),
  });

  if (isPending || !property) {
    return <main className="p-4 text-neutral-400">…</main>;
  }

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{t("edit", { name: property.name })}</h1>
      <PropertyForm property={property} />
    </main>
  );
}
