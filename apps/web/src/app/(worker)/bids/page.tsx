"use client";

import { useTranslations } from "next-intl";
import { HandCoins } from "lucide-react";
import { BidForm } from "@/components/BidForm";
import { JobTypeIcon } from "@/components/JobTypeIcon";
import { useMe } from "@/lib/auth";
import { workerMatchesJobType } from "@/lib/assign";
import { useOpenBidJobs } from "@/lib/bids";
import { formatDayHeading, formatTimeRange, localDayKey } from "@/lib/dates";
import {
  Card,
  EmptyState,
  PageHeader,
  PageSpinner,
} from "@/components/ui";

export default function BidsPage() {
  const t = useTranslations("bids");
  const tj = useTranslations("jobType");
  const { data: me } = useMe();
  const { data: jobs, isPending } = useOpenBidJobs();

  const eligible = (jobs ?? []).filter(
    (j) => !me || workerMatchesJobType(me, j.type),
  );

  return (
    <main className="mx-auto max-w-2xl p-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {isPending && <PageSpinner />}
      {!isPending && eligible.length === 0 && (
        <EmptyState
          icon={<HandCoins size={28} aria-hidden />}
          title={t("empty")}
        />
      )}

      <div className="flex flex-col gap-4">
        {eligible.map((job) => (
          <Card key={job.id} className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              <JobTypeIcon type={job.type} size={14} className="text-subtle" />
              {tj(job.type)}
            </div>
            <h3 className="mt-1.5 font-semibold text-fg">{job.title}</h3>
            <p className="text-sm tabular-nums text-muted">
              {job.property.name} ·{" "}
              {formatDayHeading(localDayKey(job.scheduledStart))} ·{" "}
              {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
            </p>
            {job.description && (
              <p className="mt-2 text-sm text-fg-soft">{job.description}</p>
            )}
            <div className="mt-3 border-t border-border pt-3">
              <BidForm
                jobId={job.id}
                currency={job.currency}
                myBid={job.myBid}
              />
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
