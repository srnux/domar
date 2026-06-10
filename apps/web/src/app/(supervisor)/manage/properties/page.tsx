"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useProperties } from "@/lib/jobs";

export default function ManagePropertiesPage() {
  const t = useTranslations("properties");
  const { data: properties, isPending } = useProperties();

  return (
    <main className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/manage/properties/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          + {t("add")}
        </Link>
      </div>

      {isPending && <p className="text-neutral-400">…</p>}
      <div className="flex flex-col gap-3">
        {properties?.map((p) => (
          <Link
            key={p.id}
            href={`/manage/properties/${p.id}`}
            className={`rounded-xl border border-neutral-200 bg-white p-3 ${
              p.isActive ? "" : "opacity-50"
            }`}
          >
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-sm text-neutral-500">{p.address}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
