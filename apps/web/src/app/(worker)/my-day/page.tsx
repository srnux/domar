"use client";

import { useTranslations } from "next-intl";
import { JobCard } from "@/components/JobCard";
import { useMe } from "@/lib/auth";
import { localDayKey, todayKey } from "@/lib/dates";
import { useJobs } from "@/lib/jobs";

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
    <main className="p-4">
      <h1 className="text-2xl font-bold">{t("myDay")}</h1>
      <p className="mb-4 text-sm text-neutral-500">
        {t("greeting", { name: me?.name?.split(" ")[0] ?? "" })}
      </p>

      {needsResponse.length > 0 && (
        <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {t("needsResponse", { count: needsResponse.length })}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {isPending && <p className="text-neutral-400">…</p>}
        {!isPending && todaysJobs.length === 0 && (
          <p className="py-8 text-center text-neutral-400">{t("noJobsToday")}</p>
        )}
        {todaysJobs.map((job) => (
          <JobCard key={job.id} job={job} href={`/my-jobs/${job.id}`} />
        ))}
      </div>
    </main>
  );
}
