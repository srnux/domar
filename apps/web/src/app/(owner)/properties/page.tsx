"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Home } from "lucide-react";
import { useProperties } from "@/lib/jobs";
import { Card, EmptyState, PageHeader, PageSpinner } from "@/components/ui";

export default function OwnerPropertiesPage() {
  const t = useTranslations("owner");
  const { data: properties, isPending } = useProperties();

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <PageHeader title={t("myProperties")} />
      {isPending && <PageSpinner />}
      {!isPending && properties?.length === 0 && (
        <EmptyState
          icon={<Home size={22} aria-hidden />}
          title={t("noProperties")}
        />
      )}
      <div className="flex flex-col gap-3">
        {properties?.map((p) => (
          <Link key={p.id} href={`/properties/${p.id}`} className="block">
            <Card className="flex items-center justify-between gap-3 p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-fg">
                  <Home size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-fg">{p.name}</h3>
                  <p className="truncate text-sm text-muted">{p.address}</p>
                </div>
              </div>
              <ChevronRight
                size={18}
                className="shrink-0 text-subtle"
                aria-hidden
              />
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
