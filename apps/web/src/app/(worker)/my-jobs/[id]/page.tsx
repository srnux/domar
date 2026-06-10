"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { JobChecklist } from "@/components/JobChecklist";
import { JobPhotos } from "@/components/JobPhotos";
import { StatusBadge } from "@/components/StatusBadge";
import { formatTimeRange, localDayKey, formatDayHeading } from "@/lib/dates";
import { useJob, useTransitionJob } from "@/lib/jobs";

export default function WorkerJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("worker");
  const tj = useTranslations("jobType");
  const router = useRouter();
  const { data: job, isPending } = useJob(id);
  const transition = useTransitionJob(id);

  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);
  const [notes, setNotes] = useState("");
  const [showFinish, setShowFinish] = useState(false);

  if (isPending || !job) {
    return <main className="p-4 text-neutral-400">…</main>;
  }

  const can = (s: string) => job.allowedTransitions.includes(s as never);
  const mapsUrl =
    job.property.lat != null && job.property.lng != null
      ? `https://maps.google.com/?q=${job.property.lat},${job.property.lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(job.property.address)}`;

  const act = (payload: Parameters<typeof transition.mutate>[0]) =>
    transition.mutate(payload, {
      onSuccess: () => {
        setShowDecline(false);
        setShowFinish(false);
      },
    });

  return (
    <main className="flex flex-col gap-4 p-4">
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
          {formatDayHeading(localDayKey(job.scheduledStart))} ·{" "}
          {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-3">
        <h2 className="font-semibold">{job.property.name}</h2>
        <p className="text-sm text-neutral-600">{job.property.address}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm font-medium text-blue-600"
        >
          {t("openInMaps")} ↗
        </a>
        {job.property.accessNotes && (
          <div className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
            <span className="font-semibold">{t("access")}: </span>
            {job.property.accessNotes}
          </div>
        )}
      </section>

      {job.description && (
        <section className="rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
          {job.description}
        </section>
      )}

      <JobChecklist
        job={job}
        readOnly={job.status !== "IN_PROGRESS" && job.status !== "ACCEPTED"}
      />
      {(job.status === "IN_PROGRESS" || job.photos.length > 0) && (
        <JobPhotos job={job} canUpload={job.status === "IN_PROGRESS"} />
      )}

      {job.statusReason && job.status === "ASSIGNED" && (
        <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
          {t("reopenedNote", { reason: job.statusReason })}
        </p>
      )}

      {transition.isError && (
        <p role="alert" className="text-sm text-red-600">
          {transition.error.message}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {can("ACCEPTED") && (
          <button
            onClick={() => act({ to: "ACCEPTED" })}
            disabled={transition.isPending}
            className="rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50"
          >
            {t("accept")}
          </button>
        )}
        {can("DECLINED") && !showDecline && (
          <button
            onClick={() => setShowDecline(true)}
            className="rounded-lg border border-neutral-300 py-3 font-semibold text-neutral-700"
          >
            {t("decline")}
          </button>
        )}
        {showDecline && (
          <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
            <label className="text-sm font-medium text-orange-800">
              {t("declineReason")}
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={2}
              className="rounded-lg border border-neutral-300 p-2 text-sm"
            />
            <button
              onClick={() => act({ to: "DECLINED", reason: declineReason })}
              disabled={!declineReason.trim() || transition.isPending}
              className="rounded-lg bg-orange-600 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {t("confirmDecline")}
            </button>
          </div>
        )}
        {can("IN_PROGRESS") && (
          <button
            onClick={() => act({ to: "IN_PROGRESS" })}
            disabled={transition.isPending}
            className="rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50"
          >
            {t("start")}
          </button>
        )}
        {can("DONE") && !showFinish && (
          <button
            onClick={() => setShowFinish(true)}
            className="rounded-lg bg-green-600 py-3 font-semibold text-white"
          >
            {t("finish")}
          </button>
        )}
        {showFinish && (
          <div className="flex flex-col gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
            <label className="text-sm font-medium text-green-800">
              {t("finishNotes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-lg border border-neutral-300 p-2 text-sm"
            />
            <button
              onClick={() => act({ to: "DONE", workerNotes: notes })}
              disabled={transition.isPending}
              className="rounded-lg bg-green-600 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {t("confirmFinish")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
