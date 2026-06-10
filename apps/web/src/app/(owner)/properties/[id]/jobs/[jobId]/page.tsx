"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CommentThread } from "@/components/CommentThread";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDayHeading, formatTimeRange, localDayKey } from "@/lib/dates";
import { useJob } from "@/lib/jobs";

export default function OwnerJobPage({
  params,
}: {
  params: Promise<{ id: string; jobId: string }>;
}) {
  const { jobId } = use(params);
  const t = useTranslations("owner");
  const tj = useTranslations("jobType");
  const router = useRouter();
  const { data: job, isPending } = useJob(jobId);

  if (isPending || !job) {
    return <main className="p-4 text-neutral-400">…</main>;
  }

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
          {formatDayHeading(localDayKey(job.scheduledStart))} ·{" "}
          {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
          {job.assignedWorker
            ? ` · ${job.assignedWorker.name.split(" ")[0]}`
            : ""}
        </p>
      </div>

      {job.photos.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-3">
          <h2 className="mb-2 font-semibold">{t("photos")}</h2>
          <div className="flex flex-wrap gap-2">
            {job.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={`/api/photos/${p.id}`}
                alt={p.caption ?? p.kind}
                title={p.caption ?? undefined}
                className="h-24 w-24 rounded-lg object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <CommentThread jobId={job.id} canChooseVisibility={false} />
    </main>
  );
}
