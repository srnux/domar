import type { JobDto } from "@domar/shared";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, User, Wallet } from "lucide-react";
import { formatTimeRange } from "@/lib/dates";
import { priceLabel } from "@/lib/pricing";
import { StatusBadge } from "./StatusBadge";
import { JobTypeIcon } from "./JobTypeIcon";

export function JobCard({ job, href }: { job: JobDto; href: string }) {
  const t = useTranslations("jobType");
  const price = priceLabel(job);
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-surface p-3.5 shadow-sm transition-[border-color,box-shadow] duration-[120ms] ease-domar hover:border-border-strong hover:shadow-md active:bg-surface-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <JobTypeIcon type={job.type} size={14} className="text-subtle" />
          {t(job.type)}
        </span>
        <StatusBadge status={job.status} />
      </div>
      <h3 className="mt-2 font-semibold text-fg">{job.title}</h3>
      <p className="text-sm text-muted">{job.property.name}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-soft">
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock size={14} className="text-subtle" aria-hidden />
          {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
        </span>
        {job.assignedWorker && (
          <span className="inline-flex items-center gap-1.5">
            <User size={14} className="text-subtle" aria-hidden />
            {job.assignedWorker.name}
          </span>
        )}
        {price && (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Wallet size={14} className="text-subtle" aria-hidden />
            {price}
          </span>
        )}
      </p>
    </Link>
  );
}
