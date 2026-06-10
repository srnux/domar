"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Home, Plus } from "lucide-react";
import { useProperties } from "@/lib/jobs";
import {
  buttonClass,
  Card,
  EmptyState,
  PageHeader,
  PageSpinner,
} from "@/components/ui";

export default function ManagePropertiesPage() {
  const t = useTranslations("properties");
  const { data: properties, isPending } = useProperties();

  return (
    <main className="mx-auto max-w-3xl p-4">
      <PageHeader
        title={t("title")}
        action={
          <Link
            href="/manage/properties/new"
            className={buttonClass({ variant: "primary" })}
          >
            <Plus size={16} aria-hidden /> {t("add")}
          </Link>
        }
      />

      {isPending && <PageSpinner />}
      {!isPending && properties?.length === 0 && (
        <EmptyState icon={<Home size={22} aria-hidden />} title={t("title")} />
      )}
      <div className="flex flex-col gap-3">
        {properties?.map((p) => (
          <Link
            key={p.id}
            href={`/manage/properties/${p.id}`}
            className="block"
          >
            <Card
              className={`flex items-center justify-between gap-3 p-3.5 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md ${
                p.isActive ? "" : "opacity-55"
              }`}
            >
              <div className="min-w-0">
                <h3 className="font-semibold text-fg">{p.name}</h3>
                <p className="truncate text-sm text-muted">{p.address}</p>
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
