"use client";

import { Suspense, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { JobForm } from "@/components/JobForm";
import { useJob } from "@/lib/jobs";
import { PageSpinner } from "@/components/ui";

export default function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: job, isPending } = useJob(id);

  // Only drafts are editable; anything further along goes back to the detail page.
  const editable = job?.status === "DRAFT";
  useEffect(() => {
    if (job && !editable) {
      router.replace(`/jobs/${id}`);
    }
  }, [job, editable, id, router]);

  if (isPending || !job || !editable) {
    return <PageSpinner />;
  }

  return (
    <Suspense>
      <JobForm job={job} />
    </Suspense>
  );
}
