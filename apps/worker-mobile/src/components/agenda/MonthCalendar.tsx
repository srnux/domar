"use client";

import type { JobDto } from "@domar/shared";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_VARIANT } from "@/components/StatusBadge";
import { Button, buttonClass, cn } from "@/components/ui";
import { avatarGradient, initials } from "./agenda-layout";
import {
  addMonthsToKey,
  formatMonthLabel,
  formatTime,
  groupByLocalDay,
  monthGridDays,
  startOfMonthKey,
  todayKey,
  WEEKDAY_SHORT,
} from "@/lib/dates";

const MAX_CHIPS = 3;

/** Soft status tint for a calendar chip, keyed by STATUS_VARIANT. */
const CHIP_CLASS: Record<string, string> = {
  draft: "bg-st-draft-soft text-st-draft",
  assigned: "bg-st-assigned-soft text-st-assigned",
  accepted: "bg-st-accepted-soft text-st-accepted",
  declined: "bg-st-declined-soft text-st-declined",
  progress: "bg-st-progress-soft text-st-progress",
  done: "bg-st-done-soft text-st-done",
  verified: "bg-st-verified-soft text-st-verified",
};

/**
 * Outlook-style monthly calendar: a Monday-first 7-column grid of day cells,
 * each marking its jobs (worker avatar + start time + type), with prev/next
 * month navigation. Operates on the loaded job list; months without loaded
 * jobs render empty.
 */
export function MonthCalendar({ jobs }: { jobs: JobDto[] }) {
  const t = useTranslations("supervisor");
  const tType = useTranslations("jobType");
  const [anchor, setAnchor] = useState(() => startOfMonthKey(todayKey()));

  const today = todayKey();
  const anchorMonth = anchor.slice(0, 7);
  const byDay = groupByLocalDay(
    jobs.filter((j) => j.status !== "CANCELLED"),
    (j) => j.scheduledStart,
  );
  const days = monthGridDays(anchor);

  return (
    <div className="dom-card mb-6 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("prevMonth")}
            onClick={() => setAnchor(addMonthsToKey(anchor, -1))}
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <h2 className="min-w-[9rem] text-center text-base font-semibold text-fg">
            {formatMonthLabel(anchor)}
          </h2>
          <button
            type="button"
            aria-label={t("nextMonth")}
            onClick={() => setAnchor(addMonthsToKey(anchor, 1))}
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAnchor(startOfMonthKey(today))}
        >
          {t("today")}
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_SHORT.map((label) => (
          <div
            key={label}
            className="pb-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-muted"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayJobs = byDay.get(day) ?? [];
          const outside = day.slice(0, 7) !== anchorMonth;
          const isToday = day === today;
          const overflow = dayJobs.length - MAX_CHIPS;
          return (
            <div
              key={day}
              className={cn(
                "min-h-[6.5rem] border-b border-r border-border p-1 [&:nth-child(7n)]:border-r-0",
                outside && "bg-surface-2/50",
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[11px] tabular-nums",
                    isToday
                      ? "bg-accent font-semibold text-white"
                      : outside
                        ? "text-subtle"
                        : "text-muted",
                  )}
                >
                  {Number(day.slice(8, 10))}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {dayJobs.slice(0, MAX_CHIPS).map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    title={`${tType(job.type)} · ${job.property.name}`}
                    className={cn(
                      "flex items-center gap-1 rounded-sm px-1 py-0.5 text-[11px] leading-tight",
                      CHIP_CLASS[STATUS_VARIANT[job.status]] ??
                        "bg-surface-2 text-muted",
                    )}
                  >
                    {job.assignedWorker ? (
                      <span
                        title={job.assignedWorker.name}
                        style={{
                          background: avatarGradient(job.assignedWorker.id),
                        }}
                        className="grid size-[14px] shrink-0 place-items-center rounded-full text-[8px] font-semibold text-surface"
                      >
                        {initials(job.assignedWorker.name)}
                      </span>
                    ) : (
                      <span className="grid size-[14px] shrink-0 place-items-center rounded-full border border-border bg-surface text-[8px] font-semibold text-muted">
                        ?
                      </span>
                    )}
                    <span className="shrink-0 tabular-nums opacity-80">
                      {formatTime(job.scheduledStart)}
                    </span>
                    <span className="truncate font-medium">
                      {tType(job.type)}
                    </span>
                  </Link>
                ))}
                {overflow > 0 && (
                  <span className="px-1 text-[10px] font-medium text-muted">
                    {t("moreJobs", { count: overflow })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
