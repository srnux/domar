"use client";

import type { Role, UserDto } from "@domar/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

/** Where each role lands after login. */
export const ROLE_HOME: Record<Role, string> = {
  SUPERVISOR: "/dashboard",
  WORKER: "/my-day",
  OWNER: "/properties",
};

/** Landing route for a user — platform admins go to the admin area. */
export function homeFor(user: Pick<UserDto, "role" | "isPlatformAdmin">): string {
  return user.isPlatformAdmin ? "/admin" : ROLE_HOME[user.role];
}

export function useMe() {
  return useQuery<UserDto, ApiError>({
    queryKey: ["me"],
    queryFn: () => api<UserDto>("/api/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<UserDto, ApiError, { email: string; password: string }>({
    mutationFn: (credentials) =>
      api<UserDto>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: true }>("/api/auth/logout", { method: "POST" }),
    onSettled: () => {
      queryClient.removeQueries();
    },
  });
}
