"use client";

import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { formatDayHeading, groupByLocalDay, todayKey } from "@/lib/dates";
import { useJobs } from "@/lib/jobs";
import { EmptyState, PageHeader, PageSpinner } from "@/components/ui";

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
    <main className="mx-auto max-w-2xl p-4">
      <PageHeader title={t("myWeek")} />
      {isPending && <PageSpinner />}
      {!isPending && grouped.size === 0 && (
        <EmptyState
          icon={<CalendarDays size={22} aria-hidden />}
          title={t("noJobsAhead")}
        />
      )}
      {[...grouped.entries()].map(([day, dayJobs]) => (
        <section key={day} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
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
