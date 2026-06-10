"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProperties } from "@/lib/jobs";

export default function OwnerPropertiesPage() {
  const t = useTranslations("owner");
  const { data: properties, isPending } = useProperties();

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{t("myProperties")}</h1>
      {isPending && <p className="text-neutral-400">…</p>}
      {!isPending && properties?.length === 0 && (
        <p className="py-8 text-center text-neutral-400">{t("noProperties")}</p>
      )}
      <div className="flex flex-col gap-3">
        {properties?.map((p) => (
          <Link
            key={p.id}
            href={`/properties/${p.id}`}
            className="rounded-xl border border-neutral-200 bg-white p-3"
          >
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-sm text-neutral-500">{p.address}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
