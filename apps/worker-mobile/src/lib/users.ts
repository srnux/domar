"use client";

import type { Role, Skill, UserDto } from "@domar/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api } from "./api-client";
import { resizeImage } from "./image-resize";

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

/** Upload/replace the signed-in user's own avatar. */
export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  return useMutation<UserDto, ApiError, File>({
    mutationFn: async (file) => {
      const resized = await resizeImage(file);
      const form = new FormData();
      form.append("file", resized, "avatar.jpg");
      return api<UserDto>("/api/users/me/avatar", {
        method: "PUT",
        body: form,
      });
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
