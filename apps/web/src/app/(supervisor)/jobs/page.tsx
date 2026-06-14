"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { JobStatus } from "@domar/shared";
import { Briefcase, Plus } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { STATUS_VARIANT } from "@/components/StatusBadge";
import { useJobs } from "@/lib/jobs";
import {
  buttonClass,
  EmptyState,
  PageHeader,
  PageSpinner,
} from "@/components/ui";

// Active statuses only, in lifecycle order. Terminal statuses
// (VERIFIED, CANCELLED) are intentionally omitted from this overview.
const GROUP_ORDER: JobStatus[] = [
  "DRAFT",
  "OPEN",
  "ASSIGNED",
  "ACCEPTED",
  "DECLINED",
  "IN_PROGRESS",
  "DONE",
];

export default function JobsPage() {
  const t = useTranslations("supervisor");
  const statusT = useTranslations("status");
  const { data: jobs, isPending } = useJobs();

  // useJobs() returns jobs ordered by scheduledStart ascending, so each
  // group stays chronologically ordered (soonest first) by construction.
  const groups = GROUP_ORDER.map((status) => ({
    status,
    jobs: (jobs ?? []).filter((j) => j.status === status),
  })).filter((g) => g.jobs.length > 0);

  return (
    <main className="mx-auto max-w-6xl p-4">
      <PageHeader
        title={t("jobs")}
        action={
          <Link href="/jobs/new" className={buttonClass({ variant: "primary" })}>
            <Plus size={16} aria-hidden /> {t("newJob")}
          </Link>
        }
      />

      {isPending && <PageSpinner />}

      {!isPending && groups.length === 0 && (
        <EmptyState
          icon={<Briefcase size={22} aria-hidden />}
          title={t("noJobs")}
        />
      )}

      {!isPending &&
        groups.map(({ status, jobs: statusJobs }) => (
          <section key={status} className="mb-6">
            <h2
              className={`dom-status-fg ${STATUS_VARIANT[status]} mb-2 text-xs font-semibold uppercase tracking-wide`}
            >
              {statusT(status)}
            </h2>
            <div className="flex flex-col gap-3">
              {statusJobs.map((job) => (
                <JobCard key={job.id} job={job} href={`/jobs/${job.id}`} />
              ))}
            </div>
          </section>
        ))}
    </main>
  );
}
