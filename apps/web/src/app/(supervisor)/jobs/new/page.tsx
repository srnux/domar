import { Suspense } from "react";
import { JobForm } from "@/components/JobForm";

export default function NewJobPage() {
  return (
    <Suspense>
      <JobForm />
    </Suspense>
  );
}
