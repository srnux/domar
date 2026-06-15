"use client";

import type { CompanyStatus } from "@domar/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

/** A tenant as returned by the platform-admin endpoints. */
export interface AdminCompanyDto {
  id: string;
  name: string;
  status: CompanyStatus;
  plan: string | null;
  maxSeats: number;
  monthlyFeeCents: number;
  ownerUserId: string | null;
  parentCompanyId: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string } | null;
  seatsUsed: number;
}

export interface CreateCompanyPayload {
  name: string;
  maxSeats: number;
  plan?: string;
  monthlyFeeCents?: number;
  parentCompanyId?: string;
  supervisor: { email: string; name: string; password: string; phone?: string };
}

export interface UpdateCompanyPayload {
  name?: string;
  plan?: string;
  maxSeats?: number;
  monthlyFeeCents?: number;
}

export function useCompanies() {
  return useQuery<AdminCompanyDto[], ApiError>({
    queryKey: ["admin", "companies"],
    queryFn: () => api<AdminCompanyDto[]>("/api/admin/companies"),
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation<AdminCompanyDto, ApiError, CreateCompanyPayload>({
    mutationFn: (payload) =>
      api<AdminCompanyDto>("/api/admin/companies", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "companies"] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation<
    AdminCompanyDto,
    ApiError,
    { id: string; patch: UpdateCompanyPayload }
  >({
    mutationFn: ({ id, patch }) =>
      api<AdminCompanyDto>(`/api/admin/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "companies"] }),
  });
}

export function useSetCompanyStatus() {
  const qc = useQueryClient();
  return useMutation<
    AdminCompanyDto,
    ApiError,
    { id: string; action: "suspend" | "activate" }
  >({
    mutationFn: ({ id, action }) =>
      api<AdminCompanyDto>(`/api/admin/companies/${id}/${action}`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "companies"] }),
  });
}
