"use client";

import type {
  CreateJobPayload,
  JobDto,
  PropertyDto,
  TransitionJobPayload,
  UserDto,
} from "@domar/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

export function useJobs() {
  return useQuery<JobDto[], ApiError>({
    queryKey: ["jobs"],
    queryFn: () => api<JobDto[]>("/api/jobs"),
  });
}

export function useJob(id: string) {
  return useQuery<JobDto, ApiError>({
    queryKey: ["jobs", id],
    queryFn: () => api<JobDto>(`/api/jobs/${id}`),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useTransitionJob(id: string) {
  const queryClient = useQueryClient();
  return useMutation<JobDto, ApiError, TransitionJobPayload>({
    mutationFn: (payload) =>
      api<JobDto>(`/api/jobs/${id}/transition`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (job) => {
      queryClient.setQueryData(["jobs", id], job);
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
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
