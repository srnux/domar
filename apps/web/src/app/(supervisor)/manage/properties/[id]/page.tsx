"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@domar/shared";
import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import { PropertyForm } from "@/components/PropertyForm";
import { PageHeader, PageSpinner } from "@/components/ui";

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
    return <PageSpinner />;
  }

  return (
    <main className="mx-auto max-w-xl p-4">
      <PageHeader title={t("edit", { name: property.name })} />
      <PropertyForm property={property} />
    </main>
  );
}
