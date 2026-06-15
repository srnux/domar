"use client";

import type {
  CreateJobPayload,
  JobDto,
  PropertyDto,
  TransitionJobPayload,
  UpdateJobPayload,
  UserDto,
} from "@domar/shared";
import {
  onlineManager,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api } from "./api-client";
import { enqueue, isNetworkError } from "./outbox";

export function useJobs() {
  return useQuery<JobDto[], ApiError>({
    queryKey: ["jobs"],
    queryFn: () => api<JobDto[]>("/api/jobs"),
  });
}

export function useJob(id: string) {
  const queryClient = useQueryClient();
  return useQuery<JobDto, ApiError>({
    queryKey: ["jobs", id],
    queryFn: () => api<JobDto>(`/api/jobs/${id}`),
    // Seed from the cached jobs list so the detail opens offline (and instantly)
    // when the single-job fetch can't run.
    initialData: () =>
      queryClient
        .getQueryData<JobDto[]>(["jobs"])
        ?.find((j) => j.id === id),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(["jobs"])?.dataUpdatedAt,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation<JobDto, ApiError, CreateJobPayload>({
    mutationFn: (payload) =>
      api<JobDto>("/api/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useUpdateJob(id: string) {
  const queryClient = useQueryClient();
  return useMutation<JobDto, ApiError, UpdateJobPayload>({
    mutationFn: (payload) =>
      api<JobDto>(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (job) => {
      queryClient.setQueryData(["jobs", id], job);
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useTransitionJob(id: string) {
  const queryClient = useQueryClient();
  return useMutation<
    JobDto | null,
    ApiError,
    TransitionJobPayload,
    { previous?: JobDto }
  >({
    mutationFn: async (payload) => {
      const queueIt = () =>
        enqueue({ kind: "transition", jobId: id, payload });
      if (!onlineManager.isOnline()) {
        await queueIt();
        return queryClient.getQueryData<JobDto>(["jobs", id]) ?? null;
      }
      try {
        return await api<JobDto>(`/api/jobs/${id}/transition`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } catch (err) {
        if (isNetworkError(err)) {
          await queueIt();
          return queryClient.getQueryData<JobDto>(["jobs", id]) ?? null;
        }
        throw err;
      }
    },
    // Optimistically reflect the new status; roll back if the server rejects.
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["jobs", id] });
      const previous = queryClient.getQueryData<JobDto>(["jobs", id]);
      if (previous) {
        queryClient.setQueryData<JobDto>(["jobs", id], {
          ...previous,
          status: payload.to,
        });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous)
        queryClient.setQueryData(["jobs", id], context.previous);
    },
    onSuccess: (job) => {
      if (job) queryClient.setQueryData(["jobs", id], job);
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useProperties() {
  return useQuery<PropertyDto[], ApiError>({
    queryKey: ["properties"],
    queryFn: () => api<PropertyDto[]>("/api/properties"),
  });
}

export function useWorkers() {
  return useQuery<UserDto[], ApiError>({
    queryKey: ["users", "WORKER"],
    queryFn: () => api<UserDto[]>("/api/users?role=WORKER"),
  });
}
