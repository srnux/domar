"use client";

import type { CreateCommentPayload, JobCommentDto } from "@domar/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

export function useComments(jobId: string) {
  return useQuery<JobCommentDto[], ApiError>({
    queryKey: ["jobs", jobId, "comments"],
    queryFn: () => api<JobCommentDto[]>(`/api/jobs/${jobId}/comments`),
  });
}

export function usePostComment(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<JobCommentDto, ApiError, CreateCommentPayload>({
    mutationFn: (payload) =>
      api<JobCommentDto>(`/api/jobs/${jobId}/comments`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "comments"] }),
  });
}
