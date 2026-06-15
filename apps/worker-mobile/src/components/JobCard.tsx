import type { JobDto } from "@domar/shared";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, Pencil, User, Wallet } from "lucide-react";
import { formatTimeRange } from "@/lib/dates";
import { priceLabel } from "@/lib/pricing";
import { StatusBadge } from "./StatusBadge";
import { JobTypeIcon } from "./JobTypeIcon";
import { PriceTypeBadge } from "./PriceTypeBadge";

export function JobCard({
  job,
  href,
  editHref,
}: {
  job: JobDto;
  href: string;
  /** When set, shows an edit icon linking straight to the job's edit form. */
  editHref?: string;
}) {
  const t = useTranslations("jobType");
  const ts = useTranslations("supervisor");
  const price = priceLabel(job);
  return (
    // Stretched-link pattern: the whole card navigates to `href`, while the edit
    // icon stays a separate, independently-clickable link (no nested anchors).
    <div className="group relative rounded-lg border border-border bg-surface p-3.5 shadow-sm transition-[border-color,box-shadow] duration-[120ms] ease-domar hover:border-border-strong hover:shadow-md focus-within:border-border-strong">
      <Link
        href={href}
        aria-label={job.title}
        className="absolute inset-0 rounded-lg active:bg-surface-2"
      />
      <div className="pointer-events-none relative">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              <JobTypeIcon type={job.type} size={14} className="text-subtle" />
              {t(job.type)}
            </span>
            <PriceTypeBadge job={job} />
          </span>
          <span className="flex items-center gap-2">
            {editHref && (
              <Link
                href={editHref}
                aria-label={ts("editJob")}
                className="pointer-events-auto grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Pencil size={14} aria-hidden />
              </Link>
            )}
            <StatusBadge status={job.status} />
          </span>
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
      </div>
    </div>
  );
}
