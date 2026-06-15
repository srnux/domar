"use client";

import type { JobStatus } from "@domar/shared";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardHeader, Spinner } from "@/components/ui";
import { useActivity } from "@/lib/activity";
import { formatDayHeading, formatTime, localDayKey, todayKey } from "@/lib/dates";

/** toStatus → verb key in the activity.verb namespace. */
const STATUS_VERB: Record<JobStatus, string> = {
  DRAFT: "created",
  OPEN: "created",
  ASSIGNED: "assigned",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  IN_PROGRESS: "started",
  DONE: "finished",
  VERIFIED: "verified",
  CANCELLED: "cancelled",
};

/** Audit feed of recent job lifecycle events, newest first. */
export function RecentActivityCard() {
  const t = useTranslations("activity");
  const tType = useTranslations("jobType");
  const { data: events, isPending } = useActivity();

  return (
    <Card>
      <CardHeader
        title={t("title")}
        count={t("todaySuffix")}
        action={
          /* TODO: audit log page — link is a stub for now */
          <Link href="#" className="text-xs text-muted hover:text-fg">
            {t("auditLog")}
          </Link>
        }
      />
      <div className="px-4 py-3">
        {isPending && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}
        {!isPending && (events?.length ?? 0) === 0 && (
          <p className="py-4 text-center text-sm text-muted">{t("empty")}</p>
        )}
        <div className="flex flex-col">
          {(events ?? []).map((event) => {
            const verb =
              event.type === "CREATED"
                ? t("verb.created")
                : t(`verb.${STATUS_VERB[event.toStatus ?? "DRAFT"]}`);
            const declined = event.toStatus === "DECLINED";
            return (
              <div
                key={event.id}
                className="grid grid-cols-[52px_1fr] gap-3 border-t border-dashed border-border py-2.5 first:border-t-0 first:pt-0"
              >
                <span className="pt-px font-mono text-[11.5px] tabular-nums text-subtle">
                  {formatEventTime(event.createdAt)}
                </span>
                <span className={`text-sm ${declined ? "text-st-declined" : ""}`}>
                  <b className="font-semibold">{event.actor?.name ?? t("system")}</b>{" "}
                  {verb}{" "}
                  <b className="font-semibold">
                    {tType(event.job.type)} · {event.job.property.name}
                  </b>
                  {event.reason && (
                    <span className="ml-1.5 inline-block rounded border border-border bg-surface-2 px-1.5 text-[11px] text-muted">
                      {event.reason}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function formatEventTime(iso: string): string {
  const time = formatTime(iso);
  return localDayKey(iso) === todayKey()
    ? time
    : `${formatDayHeading(localDayKey(iso))} ${time}`;
}
