"use client";

import type { JobDto } from "@domar/shared";
import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader } from "@/components/ui";
import { avatarGradient, initials } from "@/components/agenda/agenda-layout";
import { localDayKey, todayKey } from "@/lib/dates";
import { useWorkers } from "@/lib/jobs";

/**
 * Per-worker load for today: a bar sized relative to the busiest worker.
 * There is no capacity field on a worker, so this is a count, not a ratio.
 */
export function WorkerLoadCard({ jobs }: { jobs: JobDto[] }) {
  const t = useTranslations("supervisor");
  const tType = useTranslations("jobType");
  const { data: workers } = useWorkers();

  const rows = useMemo(() => {
    const today = todayKey();
    const counts = new Map<string, number>();
    for (const job of jobs) {
      const workerId = job.assignedWorker?.id;
      if (!workerId) continue;
      if (job.status === "CANCELLED" || job.status === "VERIFIED") continue;
      if (localDayKey(job.scheduledStart) !== today) continue;
      counts.set(workerId, (counts.get(workerId) ?? 0) + 1);
    }
    return (workers ?? [])
      .map((w) => ({ worker: w, count: counts.get(w.id) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [jobs, workers]);

  if (rows.length === 0) return null;

  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card>
      <CardHeader
        title={t("workerLoad")}
        count={t("todaySuffix")}
        action={
          /* TODO: team page — link is a stub for now */
          <Link href="#" className="text-xs text-muted hover:text-fg">
            {t("teamLink")}
          </Link>
        }
      />
      <div className="flex flex-col gap-3.5 px-4 py-4">
        {rows.map(({ worker, count }) => (
          <div key={worker.id} className="flex items-center gap-2.5">
            <span
              className="grid size-[30px] shrink-0 place-items-center rounded-full text-xs font-semibold text-surface"
              style={{ background: avatarGradient(worker.id) }}
              aria-hidden
            >
              {initials(worker.name)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">
                  {worker.name}
                </span>
                {worker.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded border border-border bg-surface-2 px-1.5 text-[10.5px] text-muted"
                  >
                    {tType(skill)}
                  </span>
                ))}
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">
              {count}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
