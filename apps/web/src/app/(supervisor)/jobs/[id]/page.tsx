"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { JobChecklist } from "@/components/JobChecklist";
import { JobPhotos } from "@/components/JobPhotos";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDayHeading, formatTimeRange, localDayKey } from "@/lib/dates";
import { useJob, useTransitionJob, useWorkers } from "@/lib/jobs";

export default function SupervisorJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("supervisor");
  const tj = useTranslations("jobType");
  const router = useRouter();
  const { data: job, isPending } = useJob(id);
  const { data: workers } = useWorkers();
  const transition = useTransitionJob(id);

  const [workerId, setWorkerId] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [showReopen, setShowReopen] = useState(false);

  if (isPending || !job) {
    return <main className="p-4 text-neutral-400">…</main>;
  }

  const can = (s: string) => job.allowedTransitions.includes(s as never);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <button
        onClick={() => router.back()}
        className="self-start text-sm text-neutral-500"
      >
        ← {t("back")}
      </button>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {tj(job.type)}
          </span>
          <StatusBadge status={job.status} />
        </div>
        <h1 className="mt-1 text-2xl font-bold">{job.title}</h1>
        <p className="text-sm text-neutral-500">
          {job.property.name} ·{" "}
          {formatDayHeading(localDayKey(job.scheduledStart))} ·{" "}
          {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
        </p>
        <p className="text-sm text-neutral-500">
          {job.assignedWorker
            ? t("assignedTo", { name: job.assignedWorker.name })
            : t("unassigned")}
        </p>
      </div>

      {job.statusReason && (
        <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
          {t("lastReason", { reason: job.statusReason })}
        </p>
      )}
      {job.workerNotes && (
        <section className="rounded-xl border border-neutral-200 bg-white p-3 text-sm">
          <h2 className="mb-1 font-semibold">{t("workerNotes")}</h2>
          <p className="text-neutral-700">{job.workerNotes}</p>
        </section>
      )}
      {job.description && (
        <section className="rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
          {job.description}
        </section>
      )}

      <JobChecklist job={job} readOnly />
      {job.photos.length > 0 && <JobPhotos job={job} canUpload={false} />}

      {transition.isError && (
        <p role="alert" className="text-sm text-red-600">
          {transition.error.message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {can("ASSIGNED") && job.status !== "DONE" && (
          <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <label className="text-sm font-medium text-blue-800">
              {job.status === "DECLINED" ? t("reassignTo") : t("assignTo")}
            </label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5"
            >
              <option value="">{t("selectWorker")}</option>
              {(workers ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                transition.mutate({ to: "ASSIGNED", assignedWorkerId: workerId })
              }
              disabled={!workerId || transition.isPending}
              className="rounded-lg bg-blue-600 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {t("assign")}
            </button>
          </div>
        )}

        {can("VERIFIED") && (
          <button
            onClick={() => transition.mutate({ to: "VERIFIED" })}
            disabled={transition.isPending}
            className="rounded-lg bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            ✓ {t("verify")}
          </button>
        )}

        {job.status === "DONE" && !showReopen && (
          <button
            onClick={() => setShowReopen(true)}
            className="rounded-lg border border-neutral-300 py-3 font-semibold text-neutral-700"
          >
            {t("reopen")}
          </button>
        )}
        {showReopen && (
          <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
            <label className="text-sm font-medium text-orange-800">
              {t("reopenReason")}
            </label>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              rows={2}
              className="rounded-lg border border-neutral-300 p-2 text-sm"
            />
            <button
              onClick={() =>
                transition.mutate(
                  { to: "ASSIGNED", reason: reopenReason },
                  { onSuccess: () => setShowReopen(false) },
                )
              }
              disabled={!reopenReason.trim() || transition.isPending}
              className="rounded-lg bg-orange-600 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {t("confirmReopen")}
            </button>
          </div>
        )}

        {can("CANCELLED") && (
          <button
            onClick={() => transition.mutate({ to: "CANCELLED" })}
            disabled={transition.isPending}
            className="rounded-lg border border-red-200 py-3 font-semibold text-red-600"
          >
            {t("cancelJob")}
          </button>
        )}
      </div>
    </main>
  );
}
