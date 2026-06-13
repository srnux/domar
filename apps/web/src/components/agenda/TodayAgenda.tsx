"use client";

import type { JobDto } from "@domar/shared";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader } from "@/components/ui";
import { formatTimeRange, todayKey, zagrebMinutesOfDay } from "@/lib/dates";
import { useWorkers } from "@/lib/jobs";
import {
  GUTTER_W,
  HOUR_W,
  ROW_H,
  avatarGradient,
  buildAgendaModel,
  initials,
  nowLineLeftPx,
  type AgendaBlock,
} from "./agenda-layout";

/**
 * Horizontal per-worker timeline of today's jobs. Thin wrapper over
 * {@link DayAgenda} pinned to the current day.
 */
export function TodayAgenda({ jobs }: { jobs: JobDto[] }) {
  const t = useTranslations("supervisor");
  return (
    <DayAgenda jobs={jobs} dayKey={todayKey()} title={t("todayAgenda")} />
  );
}

/**
 * Horizontal per-worker timeline for a single day. Receives the full job
 * list and filters to `dayKey` itself; renders nothing on an empty day.
 * The "now" line and one-time auto-scroll only apply when `dayKey` is today.
 */
export function DayAgenda({
  jobs,
  dayKey,
  title,
}: {
  jobs: JobDto[];
  dayKey: string;
  title: string;
}) {
  const t = useTranslations("supervisor");
  const tStatus = useTranslations("status");
  const tType = useTranslations("jobType");
  const { data: workers } = useWorkers();

  const isToday = dayKey === todayKey();

  const [nowMinutes, setNowMinutes] = useState(() =>
    zagrebMinutesOfDay(new Date().toISOString()),
  );
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(
      () => setNowMinutes(zagrebMinutesOfDay(new Date().toISOString())),
      60_000,
    );
    return () => clearInterval(id);
  }, [isToday]);

  const model = useMemo(
    () => buildAgendaModel(jobs, workers, dayKey),
    [jobs, workers, dayKey],
  );

  const nowLeft =
    isToday && model ? nowLineLeftPx(nowMinutes, model) : null;

  // Bring the now line into view once — afternoons start off-screen otherwise.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didAutoScroll = useRef(false);
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (didAutoScroll.current || nowLeft == null || !scroller) return;
    didAutoScroll.current = true;
    const target = GUTTER_W + nowLeft - scroller.clientWidth * 0.6;
    if (target > 0) scroller.scrollLeft = target;
  }, [nowLeft]);

  if (!model) return null;

  const blockLine2 = (block: AgendaBlock) => {
    const { job } = block;
    if (job.status === "DECLINED") {
      return job.statusReason
        ? `${tStatus("DECLINED")} · ${job.statusReason}`
        : tStatus("DECLINED");
    }
    if (job.status === "DONE" || job.status === "VERIFIED") {
      return tStatus(job.status);
    }
    return (
      formatTimeRange(job.scheduledStart, job.scheduledEnd) +
      (block.clippedEnd ? " →" : "")
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader
        title={title}
        count={t("agendaSummary", {
          jobs: model.jobCount,
          workers: model.workerCount,
        })}
        action={
          /* TODO: full schedule page — link is a stub for now */
          <Link href="#" className="text-xs text-muted hover:text-fg">
            {t("openFullSchedule")}
          </Link>
        }
      />
      <div ref={scrollerRef} className="overflow-x-auto px-4 pb-2 pt-3.5">
        <div style={{ minWidth: GUTTER_W + HOUR_W * model.hours.length }}>
          <div
            className="grid border-b border-border pb-1.5"
            style={{
              gridTemplateColumns: `${GUTTER_W}px repeat(${model.hours.length}, ${HOUR_W}px)`,
            }}
          >
            <div className="pl-1 text-[11px] font-medium uppercase tracking-wider text-muted">
              {t("workerLabel")}
            </div>
            {model.hours.map((hour) => (
              <div
                key={hour}
                className="border-l border-dashed border-border pl-1.5 pt-0.5 text-[11.5px] tabular-nums text-subtle"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div className="relative">
            {model.lanes.map((lane) => (
              <div
                key={lane.key}
                className="grid border-b border-dashed border-border last:border-b-0"
                style={{
                  gridTemplateColumns: `${GUTTER_W}px 1fr`,
                  height: ROW_H,
                }}
              >
                <div className="flex items-center gap-2 pl-1 pr-3">
                  <span
                    className={
                      lane.unassigned
                        ? "grid size-[26px] shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-[11px] font-semibold text-muted"
                        : "grid size-[26px] shrink-0 place-items-center rounded-full text-[11px] font-semibold text-surface"
                    }
                    style={
                      lane.unassigned
                        ? undefined
                        : { background: avatarGradient(lane.key) }
                    }
                    aria-hidden
                  >
                    {lane.name ? initials(lane.name) : "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {lane.name ?? t("unassigned")}
                    </span>
                    {lane.skills.length > 0 && (
                      <span className="block truncate text-[11px] text-muted">
                        {lane.skills.map((skill) => tType(skill)).join(" · ")}
                      </span>
                    )}
                  </span>
                </div>
                <div
                  className="relative"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, var(--color-border) 1px, transparent 1px)",
                    backgroundSize: `${HOUR_W}px 100%`,
                  }}
                >
                  {lane.blocks.map((block) => (
                    <Link
                      key={block.job.id}
                      href={`/jobs/${block.job.id}`}
                      className={`dom-agenda-job ${block.variant}`}
                      style={{
                        left: block.leftPx,
                        width: block.widthPx,
                        zIndex: block.zIndex,
                      }}
                    >
                      <span className="dom-jdot" aria-hidden />
                      <span className="truncate pr-2 font-semibold">
                        {tType(block.job.type)} · {block.job.property.name}
                      </span>
                      <span className="truncate pr-2 tabular-nums opacity-80">
                        {blockLine2(block)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {nowLeft != null && (
              <div
                className="pointer-events-none absolute inset-y-0 z-10"
                style={{ left: GUTTER_W + nowLeft }}
              >
                <div className="absolute inset-y-0 w-[1.5px] bg-accent" aria-hidden />
                <div
                  className="absolute -top-1 left-[-3px] size-2 rounded-full bg-accent ring-[3px] ring-accent-soft"
                  aria-hidden
                />
                <span className="absolute left-2 top-0 text-[10px] font-semibold uppercase tracking-widest text-accent-fg">
                  {t("now")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
