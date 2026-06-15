"use client";

import type { CreateCommentPayload, JobCommentDto } from "@domar/shared";
import {
  onlineManager,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api } from "./api-client";
import { enqueue, isNetworkError } from "./outbox";

export function useComments(jobId: string) {
  return useQuery<JobCommentDto[], ApiError>({
    queryKey: ["jobs", jobId, "comments"],
    queryFn: () => api<JobCommentDto[]>(`/api/jobs/${jobId}/comments`),
  });
}

export function usePostComment(jobId: string) {
  const queryClient = useQueryClient();
  const key = ["jobs", jobId, "comments"];
  return useMutation<
    JobCommentDto | null,
    ApiError,
    CreateCommentPayload,
    { previous?: JobCommentDto[] }
  >({
    mutationFn: async (payload) => {
      const queueIt = () => enqueue({ kind: "comment", jobId, payload });
      if (!onlineManager.isOnline()) {
        await queueIt();
        return null;
      }
      try {
        return await api<JobCommentDto>(`/api/jobs/${jobId}/comments`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (err) {
        if (isNetworkError(err)) {
          await queueIt();
          return null;
        }
        throw err;
      }
    },
    // Optimistically show the comment (flagged pending until it syncs).
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<JobCommentDto[]>(key) ?? [];
      const optimistic = {
        id: `pending-${Date.now()}`,
        body: payload.body,
        visibility: payload.visibility,
        createdAt: new Date().toISOString(),
        pending: true,
      } as unknown as JobCommentDto;
      queryClient.setQueryData<JobCommentDto[]>(key, [...previous, optimistic]);
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
