"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PropertyDto } from "@domar/shared";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, ClipboardList, ReceiptText } from "lucide-react";
import { ApiError, api } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { JobTypeIcon } from "@/components/JobTypeIcon";
import { formatDayHeading, localDayKey } from "@/lib/dates";
import { useJobs } from "@/lib/jobs";
import { useBills } from "@/lib/bills";
import { formatMoney } from "@/lib/pricing";
import { Card, EmptyState, PageSpinner } from "@/components/ui";

export default function OwnerPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("owner");
  const billsT = useTranslations("bills");
  const router = useRouter();
  const { data: property } = useQuery<PropertyDto, ApiError>({
    queryKey: ["properties", id],
    queryFn: () => api(`/api/properties/${id}`),
  });
  const { data: jobs, isPending } = useJobs();
  const { data: bills } = useBills();

  const history = (jobs ?? [])
    .filter((j) => j.property.id === id && j.status !== "CANCELLED")
    .sort((a, b) => (a.scheduledStart < b.scheduledStart ? 1 : -1));

  const propertyBills = (bills ?? []).filter((b) => b.property.id === id);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <button
        onClick={() => router.back()}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden /> {t("back")}
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">
        {property?.name ?? "…"}
      </h1>
      <p className="mb-6 text-sm text-muted">{property?.address}</p>

      {propertyBills.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {billsT("title")}
          </h2>
          <div className="flex flex-col gap-3">
            {propertyBills.map((bill) => (
              <Link key={bill.id} href={`/bills/${bill.id}`} className="block">
                <Card className="p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-semibold text-fg">
                      <ReceiptText size={15} className="text-subtle" aria-hidden />
                      {bill.number}
                    </h3>
                    <span className="font-medium tabular-nums text-fg">
                      {formatMoney(bill.grossCents, bill.currency)}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {t("workHistory")}
      </h2>
      {isPending && <PageSpinner />}
      {!isPending && history.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={22} aria-hidden />}
          title={t("noWorkYet")}
        />
      )}
      <div className="flex flex-col gap-3">
        {history.map((job) => (
          <Link
            key={job.id}
            href={`/properties/${id}/jobs/${job.id}`}
            className="block"
          >
            <Card className="p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold text-fg">
                  <JobTypeIcon
                    type={job.type}
                    size={15}
                    className="text-subtle"
                  />
                  {job.title}
                </h3>
                <StatusBadge status={job.status} />
              </div>
              <p className="mt-1 flex items-center justify-between gap-2 text-sm text-muted">
                <span className="tabular-nums">
                  {formatDayHeading(localDayKey(job.scheduledStart))}
                  {job.assignedWorker
                    ? ` · ${job.assignedWorker.name.split(" ")[0]}`
                    : ""}
                </span>
                <ChevronRight size={16} className="text-subtle" aria-hidden />
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
