"use client";

import type {
  BiddableJobDto,
  BidDto,
  JobDto,
  SubmitBidPayload,
} from "@domar/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

/** Worker view: open negotiable jobs, each with the caller's own bid. */
export function useOpenBidJobs() {
  return useQuery<BiddableJobDto[], ApiError>({
    queryKey: ["bids", "open"],
    queryFn: () => api<BiddableJobDto[]>("/api/jobs/open-for-bids"),
  });
}

/** Supervisor view: all bids on a job. */
export function useJobBids(jobId: string) {
  return useQuery<BidDto[], ApiError>({
    queryKey: ["bids", jobId],
    queryFn: () => api<BidDto[]>(`/api/jobs/${jobId}/bids`),
  });
}

export function useSubmitBid(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<BidDto, ApiError, SubmitBidPayload>({
    mutationFn: (payload) =>
      api<BidDto>(`/api/jobs/${jobId}/bids`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bids"] });
    },
  });
}

export function useWithdrawBid(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ ok: true }, ApiError, string>({
    mutationFn: (bidId) =>
      api<{ ok: true }>(`/api/jobs/${jobId}/bids/${bidId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bids"] });
    },
  });
}

export function useAcceptBid(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<JobDto, ApiError, string>({
    mutationFn: (bidId) =>
      api<JobDto>(`/api/jobs/${jobId}/bids/${bidId}/accept`, {
        method: "PATCH",
      }),
    onSuccess: (job) => {
      queryClient.setQueryData(["jobs", jobId], job);
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["bids"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
