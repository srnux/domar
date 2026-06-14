"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck, Plus } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { AttentionCard } from "@/components/AttentionCard";
import { RecentActivityCard } from "@/components/RecentActivityCard";
import { WorkerLoadCard } from "@/components/WorkerLoadCard";
import { TodayAgenda } from "@/components/agenda/TodayAgenda";
import { RangeAgenda } from "@/components/agenda/RangeAgenda";
import { MonthCalendar } from "@/components/agenda/MonthCalendar";
import {
  formatDayHeading,
  groupByLocalDay,
  localDayKey,
  todayKey,
} from "@/lib/dates";
import { useJobs } from "@/lib/jobs";
import {
  buttonClass,
  EmptyState,
  PageHeader,
  PageSpinner,
  Segmented,
} from "@/components/ui";

type AgendaRange = "today" | "week" | "month";

export default function DashboardPage() {
  const t = useTranslations("supervisor");
  const { data: jobs, isPending } = useJobs();
  const [mode, setMode] = useState<AgendaRange>("today");

  const today = todayKey();
  const needsAttention = (jobs ?? []).filter(
    (j) =>
      j.status === "DRAFT" ||
      j.status === "DECLINED" ||
      j.status === "OPEN",
  );
  const active = (jobs ?? []).filter(
    (j) => j.status !== "VERIFIED" && j.status !== "CANCELLED",
  );
  // Today lives in the agenda timeline; the list below covers other days.
  const hasTodayJobs = (jobs ?? []).some(
    (j) => j.status !== "CANCELLED" && localDayKey(j.scheduledStart) === today,
  );
  const grouped = groupByLocalDay(
    active.filter((j) => localDayKey(j.scheduledStart) !== today),
    (j) => j.scheduledStart,
  );

  return (
    <main className="mx-auto max-w-6xl p-4">
      <PageHeader
        title={t("weekAgenda")}
        action={
          <div className="flex items-center gap-2">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "today", label: t("today") },
                { value: "week", label: t("week") },
                { value: "month", label: t("month") },
              ]}
            />
            <Link
              href="/jobs/new"
              className={buttonClass({ variant: "primary" })}
            >
              <Plus size={16} aria-hidden /> {t("newJob")}
            </Link>
          </div>
        }
      />

      {isPending && <PageSpinner />}

      {!isPending && mode === "week" && (
        <RangeAgenda jobs={jobs ?? []} days={7} />
      )}
      {!isPending && mode === "month" && <MonthCalendar jobs={jobs ?? []} />}

      {mode === "today" && needsAttention.length > 0 && (
        <section className="mb-6 rounded-lg border border-border border-l-[3px] border-l-warn-line bg-surface p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-warn-fg">
            <span className="dom-pulse" aria-hidden />
            {t("needsAttention", { count: needsAttention.length })}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {needsAttention.map((job) => (
              <AttentionCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {mode === "today" && !isPending && <TodayAgenda jobs={jobs ?? []} />}

      {mode === "today" && !isPending && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WorkerLoadCard jobs={jobs ?? []} />
          <RecentActivityCard />
        </div>
      )}

      {mode === "today" && !isPending && !hasTodayJobs && grouped.size === 0 && (
        <EmptyState
          icon={<CalendarCheck size={22} aria-hidden />}
          title={t("noJobs")}
        />
      )}
      {mode === "today" &&
        [...grouped.entries()].map(([day, dayJobs]) => (
          <section key={day} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {formatDayHeading(day)}
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
