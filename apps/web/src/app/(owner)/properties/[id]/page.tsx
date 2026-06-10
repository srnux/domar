"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@domar/shared";
import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDayHeading, localDayKey } from "@/lib/dates";
import { useJobs } from "@/lib/jobs";

export default function OwnerPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("owner");
  const router = useRouter();
  const { data: property } = useQuery<PropertyDto, ApiError>({
    queryKey: ["properties", id],
    queryFn: () => api(`/api/properties/${id}`),
  });
  const { data: jobs, isPending } = useJobs();

  const history = (jobs ?? [])
    .filter((j) => j.property.id === id && j.status !== "CANCELLED")
    .sort((a, b) => (a.scheduledStart < b.scheduledStart ? 1 : -1));

  return (
    <main className="mx-auto max-w-xl p-4">
      <button
        onClick={() => router.back()}
        className="mb-2 text-sm text-neutral-500"
      >
        ← {t("back")}
      </button>
      <h1 className="text-2xl font-bold">{property?.name ?? "…"}</h1>
      <p className="mb-4 text-sm text-neutral-500">{property?.address}</p>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        {t("workHistory")}
      </h2>
      {isPending && <p className="text-neutral-400">…</p>}
      {!isPending && history.length === 0 && (
        <p className="py-8 text-center text-neutral-400">{t("noWorkYet")}</p>
      )}
      <div className="flex flex-col gap-3">
        {history.map((job) => (
          <Link
            key={job.id}
            href={`/properties/${id}/jobs/${job.id}`}
            className="rounded-xl border border-neutral-200 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{job.title}</h3>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-sm text-neutral-500">
              {formatDayHeading(localDayKey(job.scheduledStart))}
              {job.assignedWorker
                ? ` · ${job.assignedWorker.name.split(" ")[0]}`
                : ""}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
