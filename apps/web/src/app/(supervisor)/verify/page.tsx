"use client";

import { useTranslations } from "next-intl";
import { JobCard } from "@/components/JobCard";
import { useJobs } from "@/lib/jobs";

export default function VerifyQueuePage() {
  const t = useTranslations("supervisor");
  const { data: jobs, isPending } = useJobs();

  const queue = (jobs ?? []).filter((j) => j.status === "DONE");

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-1 text-2xl font-bold">{t("verifyQueue")}</h1>
      <p className="mb-4 text-sm text-neutral-500">{t("verifyQueueHint")}</p>

      {isPending && <p className="text-neutral-400">…</p>}
      {!isPending && queue.length === 0 && (
        <p className="py-8 text-center text-neutral-400">{t("nothingToVerify")}</p>
      )}
      <div className="flex flex-col gap-3">
        {queue.map((job) => (
          <JobCard key={job.id} job={job} href={`/jobs/${job.id}`} />
        ))}
      </div>
    </main>
  );
}
