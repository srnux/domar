"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarCheck, Plus } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { formatDayHeading, groupByLocalDay, todayKey } from "@/lib/dates";
import { useJobs } from "@/lib/jobs";
import {
  buttonClass,
  EmptyState,
  PageHeader,
  PageSpinner,
} from "@/components/ui";

export default function DashboardPage() {
  const t = useTranslations("supervisor");
  const { data: jobs, isPending } = useJobs();

  const needsAttention = (jobs ?? []).filter(
    (j) => j.status === "DRAFT" || j.status === "DECLINED",
  );
  const active = (jobs ?? []).filter(
    (j) => j.status !== "VERIFIED" && j.status !== "CANCELLED",
  );
  const grouped = groupByLocalDay(active, (j) => j.scheduledStart);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <PageHeader
        title={t("weekAgenda")}
        action={
          <Link
            href="/jobs/new"
            className={buttonClass({ variant: "primary" })}
          >
            <Plus size={16} aria-hidden /> {t("newJob")}
          </Link>
        }
      />

      {needsAttention.length > 0 && (
        <section className="mb-6 rounded-lg border border-border border-l-[3px] border-l-warn-line bg-surface p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-warn-fg">
            <span className="dom-pulse" aria-hidden />
            {t("needsAttention", { count: needsAttention.length })}
          </h2>
          <div className="flex flex-col gap-2">
            {needsAttention.map((job) => (
              <JobCard key={job.id} job={job} href={`/jobs/${job.id}`} />
            ))}
          </div>
        </section>
      )}

      {isPending && <PageSpinner />}
      {!isPending && grouped.size === 0 && (
        <EmptyState
          icon={<CalendarCheck size={22} aria-hidden />}
          title={t("noJobs")}
        />
      )}
      {[...grouped.entries()].map(([day, dayJobs]) => (
        <section key={day} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {day === todayKey() ? t("today") : formatDayHeading(day)}
          </h2>
          <div className="flex flex-col gap-3">
            {dayJobs.map((job) => (
              <JobCard key={job.id} job={job} href={`/jobs/${job.id}`} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
