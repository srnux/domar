import type { JobDto } from "@domar/shared";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatTimeRange } from "@/lib/dates";
import { StatusBadge } from "./StatusBadge";

export function JobCard({ job, href }: { job: JobDto; href: string }) {
  const t = useTranslations("jobType");
  return (
    <Link
      href={href}
      className="block rounded-xl border border-neutral-200 bg-white p-3 shadow-sm active:bg-neutral-50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {t(job.type)}
        </span>
        <StatusBadge status={job.status} />
      </div>
      <h3 className="mt-1 font-semibold">{job.title}</h3>
      <p className="text-sm text-neutral-500">{job.property.name}</p>
      <p className="mt-1 text-sm text-neutral-600">
        {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
        {job.assignedWorker ? ` · ${job.assignedWorker.name}` : ""}
      </p>
    </Link>
  );
}
