"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { JobCard } from "@/components/JobCard";
import { formatDayHeading, groupByLocalDay, todayKey } from "@/lib/dates";
import { useJobs } from "@/lib/jobs";

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("weekAgenda")}</h1>
        <Link
          href="/jobs/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          + {t("newJob")}
        </Link>
      </div>

      {needsAttention.length > 0 && (
        <section className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-3">
          <h2 className="mb-2 text-sm font-semibold text-orange-800">
            {t("needsAttention", { count: needsAttention.length })}
          </h2>
          <div className="flex flex-col gap-2">
            {needsAttention.map((job) => (
              <JobCard key={job.id} job={job} href={`/jobs/${job.id}`} />
            ))}
          </div>
        </section>
      )}

      {isPending && <p className="text-neutral-400">…</p>}
      {!isPending && grouped.size === 0 && (
        <p className="py-8 text-center text-neutral-400">{t("noJobs")}</p>
      )}
      {[...grouped.entries()].map(([day, dayJobs]) => (
        <section key={day} className="mb-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
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
