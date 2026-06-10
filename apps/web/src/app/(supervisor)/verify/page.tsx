"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { useJobs } from "@/lib/jobs";
import { EmptyState, PageHeader, PageSpinner } from "@/components/ui";

export default function VerifyQueuePage() {
  const t = useTranslations("supervisor");
  const { data: jobs, isPending } = useJobs();

  const queue = (jobs ?? []).filter((j) => j.status === "DONE");

  return (
    <main className="mx-auto max-w-3xl p-4">
      <PageHeader title={t("verifyQueue")} subtitle={t("verifyQueueHint")} />

      {isPending && <PageSpinner />}
      {!isPending && queue.length === 0 && (
        <EmptyState
          icon={<BadgeCheck size={22} aria-hidden />}
          title={t("nothingToVerify")}
        />
      )}
      <div className="flex flex-col gap-3">
        {queue.map((job) => (
          <JobCard key={job.id} job={job} href={`/jobs/${job.id}`} />
        ))}
      </div>
    </main>
  );
}
