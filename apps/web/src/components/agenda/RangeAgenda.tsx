"use client";

import type { JobDto } from "@domar/shared";
import { useTranslations } from "next-intl";
import { CalendarCheck } from "lucide-react";
import { DayAgenda } from "@/components/agenda/TodayAgenda";
import {
  dayKeyPlus,
  formatDayHeading,
  groupByLocalDay,
  localDayKey,
  todayKey,
} from "@/lib/dates";
import { EmptyState } from "@/components/ui";

/**
 * One per-worker agenda timeline per day, for a rolling range starting today
 * (e.g. 7 or 30 days). Only days that actually have jobs render a timeline;
 * an empty range falls back to the no-jobs state.
 */
export function RangeAgenda({ jobs, days }: { jobs: JobDto[]; days: number }) {
  const t = useTranslations("supervisor");

  const start = todayKey();
  const end = dayKeyPlus(days - 1);
  // CANCELLED is dropped here to match buildAgendaModel — a day appears iff
  // its timeline will have content.
  const inRange = jobs.filter((j) => {
    if (j.status === "CANCELLED") return false;
    const key = localDayKey(j.scheduledStart);
    return key >= start && key <= end;
  });
  const grouped = groupByLocalDay(inRange, (j) => j.scheduledStart);

  if (grouped.size === 0) {
    return (
      <EmptyState
        icon={<CalendarCheck size={22} aria-hidden />}
        title={t("noJobs")}
      />
    );
  }

  return (
    <>
      {[...grouped.keys()].map((dayKey) => (
        <DayAgenda
          key={dayKey}
          jobs={jobs}
          dayKey={dayKey}
          title={dayKey === start ? t("todayAgenda") : formatDayHeading(dayKey)}
        />
      ))}
    </>
  );
}
