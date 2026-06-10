"use client";

import { useTranslations } from "next-intl";
import { BellRing, Sun } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { useMe } from "@/lib/auth";
import { localDayKey, todayKey } from "@/lib/dates";
import { useJobs } from "@/lib/jobs";
import { Callout, EmptyState, PageHeader, PageSpinner } from "@/components/ui";

export default function MyDayPage() {
  const t = useTranslations("worker");
  const { data: me } = useMe();
  const { data: jobs, isPending } = useJobs();

  const today = todayKey();
  const todaysJobs = (jobs ?? []).filter(
    (j) => localDayKey(j.scheduledStart) === today,
  );
  const needsResponse = todaysJobs.filter((j) => j.status === "ASSIGNED");

  return (
    <main className="mx-auto max-w-2xl p-4">
      <PageHeader
        title={t("myDay")}
        subtitle={t("greeting", { name: me?.name?.split(" ")[0] ?? "" })}
      />

      {needsResponse.length > 0 && (
        <Callout
          variant="info"
          className="mb-4"
          icon={<BellRing size={16} aria-hidden />}
        >
          {t("needsResponse", { count: needsResponse.length })}
        </Callout>
      )}

      {isPending && <PageSpinner />}
      {!isPending && todaysJobs.length === 0 && (
        <EmptyState
          icon={<Sun size={22} aria-hidden />}
          title={t("noJobsToday")}
        />
      )}
      <div className="flex flex-col gap-3">
        {todaysJobs.map((job) => (
          <JobCard key={job.id} job={job} href={`/my-jobs/${job.id}`} />
        ))}
      </div>
    </main>
  );
}
