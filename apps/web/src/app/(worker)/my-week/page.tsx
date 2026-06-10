"use client";

import { useTranslations } from "next-intl";
import { JobCard } from "@/components/JobCard";
import { formatDayHeading, groupByLocalDay, todayKey } from "@/lib/dates";
import { useJobs } from "@/lib/jobs";

export default function MyWeekPage() {
  const t = useTranslations("worker");
  const { data: jobs, isPending } = useJobs();

  const today = todayKey();
  const upcoming = (jobs ?? []).filter(
    (j) =>
      j.scheduledStart >= `${today}T00:00:00` ||
      j.status === "ASSIGNED" ||
      j.status === "IN_PROGRESS",
  );
  const grouped = groupByLocalDay(upcoming, (j) => j.scheduledStart);

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">{t("myWeek")}</h1>
      {isPending && <p className="text-neutral-400">…</p>}
      {!isPending && grouped.size === 0 && (
        <p className="py-8 text-center text-neutral-400">{t("noJobsAhead")}</p>
      )}
      {[...grouped.entries()].map(([day, dayJobs]) => (
        <section key={day} className="mb-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {day === todayKey() ? t("today") : formatDayHeading(day)}
          </h2>
          <div className="flex flex-col gap-3">
            {dayJobs.map((job) => (
              <JobCard key={job.id} job={job} href={`/my-jobs/${job.id}`} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
