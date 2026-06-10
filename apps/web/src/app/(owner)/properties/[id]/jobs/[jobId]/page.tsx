"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { CommentThread } from "@/components/CommentThread";
import { StatusBadge } from "@/components/StatusBadge";
import { JobTypeIcon } from "@/components/JobTypeIcon";
import { formatDayHeading, formatTimeRange, localDayKey } from "@/lib/dates";
import { useJob } from "@/lib/jobs";
import { Card, PageSpinner } from "@/components/ui";

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
    return <PageSpinner />;
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden /> {t("back")}
      </button>

      <div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <JobTypeIcon type={job.type} size={14} className="text-subtle" />
            {tj(job.type)}
          </span>
          <StatusBadge status={job.status} />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {job.title}
        </h1>
        <p className="text-sm tabular-nums text-muted">
          {formatDayHeading(localDayKey(job.scheduledStart))} ·{" "}
          {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
          {job.assignedWorker
            ? ` · ${job.assignedWorker.name.split(" ")[0]}`
            : ""}
        </p>
      </div>

      {job.photos.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-fg">
            <ImageIcon size={16} className="text-subtle" aria-hidden />
            {t("photos")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {job.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={`/api/photos/${p.id}`}
                alt={p.caption ?? p.kind}
                title={p.caption ?? undefined}
                className="size-24 rounded-md border border-border object-cover"
              />
            ))}
          </div>
        </Card>
      )}

      <CommentThread jobId={job.id} canChooseVisibility={false} />
    </main>
  );
}
