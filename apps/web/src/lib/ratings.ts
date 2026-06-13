"use client";

import type { JobDto, JobRatingDto, RateJobPayload } from "@domar/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

export function useRateJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<JobRatingDto, ApiError, RateJobPayload>({
    mutationFn: (payload) =>
      api<JobRatingDto>(`/api/jobs/${jobId}/rating`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (rating) => {
      // Reflect the new rating on the cached job immediately.
      queryClient.setQueryData<JobDto>(["jobs", jobId], (prev) =>
        prev ? { ...prev, rating } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
