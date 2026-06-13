"use client";

import type { JobDto } from "@domar/shared";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CornerDownRight } from "lucide-react";
import { formatTimeRange } from "@/lib/dates";
import { useTransitionJob, useWorkers } from "@/lib/jobs";
import { StatusBadge } from "./StatusBadge";
import { JobTypeIcon } from "./JobTypeIcon";
import { Button, Select } from "@/components/ui";

/**
 * Actionable card for the supervisor dashboard "Needs attention" grid.
 * Unlike {@link JobCard} (a read-only link), this surfaces the decline reason
 * and inline assign/cancel actions derived from the job's allowedTransitions.
 */
export function AttentionCard({ job }: { job: JobDto }) {
  const t = useTranslations("supervisor");
  const tType = useTranslations("jobType");
  const { data: workers } = useWorkers();
  const transition = useTransitionJob(job.id);

  const [assigning, setAssigning] = useState(false);
  const [workerId, setWorkerId] = useState("");

  const canAssign = job.allowedTransitions.includes("ASSIGNED");
  const canCancel = job.allowedTransitions.includes("CANCELLED");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3.5">
      <div className="flex items-center gap-2">
        <StatusBadge status={job.status} />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <JobTypeIcon type={job.type} size={13} className="text-subtle" />
          {tType(job.type)}
        </span>
      </div>

      <Link href={`/jobs/${job.id}`} className="group">
        <h3 className="font-semibold text-fg group-hover:underline">
          {job.title}
        </h3>
        <p className="text-sm tabular-nums text-muted">
          {job.property.name}
          {job.assignedWorker && ` · ${job.assignedWorker.name}`} ·{" "}
          {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
        </p>
      </Link>

      {job.statusReason && (
        <p className="flex items-start gap-1.5 rounded-md border border-warn-line/40 bg-warn-bg px-2.5 py-1.5 text-xs text-warn-fg">
          <CornerDownRight size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>{job.statusReason}</span>
        </p>
      )}

      {transition.isError && (
        <p role="alert" className="text-xs text-st-declined">
          {transition.error.message}
        </p>
      )}

      {assigning ? (
        <div className="flex flex-col gap-2">
          <Select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            autoFocus
          >
            <option value="">{t("selectWorker")}</option>
            {(workers ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                transition.mutate(
                  { to: "ASSIGNED", assignedWorkerId: workerId },
                  { onSuccess: () => setAssigning(false) },
                )
              }
              disabled={!workerId || transition.isPending}
            >
              {t("assign")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAssigning(false)}
              disabled={transition.isPending}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        (canAssign || canCancel) && (
          <div className="mt-0.5 flex gap-2">
            {canAssign && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setAssigning(true)}
              >
                {job.status === "DECLINED" ? t("reassign") : t("assign")}
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => transition.mutate({ to: "CANCELLED" })}
                disabled={transition.isPending}
              >
                {t("cancelJob")}
              </Button>
            )}
          </div>
        )
      )}
    </div>
  );
}
