"use client";

import type { Role, Skill, UserDto } from "@domar/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

export function useUsers(options: { role?: Role; includeInactive?: boolean }) {
  const params = new URLSearchParams();
  if (options.role) params.set("role", options.role);
  if (options.includeInactive) params.set("includeInactive", "true");
  const qs = params.toString();
  return useQuery<UserDto[], ApiError>({
    queryKey: ["users", qs],
    queryFn: () => api<UserDto[]>(`/api/users${qs ? `?${qs}` : ""}`),
  });
}

export function useCreateInvite() {
  return useMutation<
    { inviteUrl: string; token: string },
    ApiError,
    { email: string; role: Role; skills?: Skill[] }
  >({
    mutationFn: (payload) =>
      api("/api/invites", { method: "POST", body: JSON.stringify(payload) }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation<
    UserDto,
    ApiError,
    { id: string; isActive?: boolean; skills?: Skill[]; name?: string }
  >({
    mutationFn: ({ id, ...payload }) =>
      api<UserDto>(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
