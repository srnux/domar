"use client";

import type { ActivityEventDto } from "@domar/shared";
import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

export function useActivity() {
  return useQuery<ActivityEventDto[], ApiError>({
    queryKey: ["activity"],
    queryFn: () => api<ActivityEventDto[]>("/api/activity"),
  });
}
