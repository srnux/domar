"use client";

import type {
  AddJobLinesPayload,
  AddLineItemPayload,
  BillDto,
  CreateBillPayload,
  PriceType,
  UpdateBillPayload,
  UpdateLineItemPayload,
} from "@domar/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

/** A billable job returned by the eligible-jobs endpoint (subset of JobDto). */
export interface EligibleJobDto {
  id: string;
  title: string;
  priceType: PriceType | null;
  priceCents: number | null;
  currency: string;
  spentHours: number | null;
}

export function useBills() {
  return useQuery<BillDto[], ApiError>({
    queryKey: ["bills"],
    queryFn: () => api<BillDto[]>("/api/bills"),
  });
}

export function useBill(id: string) {
  return useQuery<BillDto, ApiError>({
    queryKey: ["bills", id],
    queryFn: () => api<BillDto>(`/api/bills/${id}`),
  });
}

/** Eligible (VERIFIED, priced, unbilled) jobs for a property in a currency. */
export function useEligibleJobs(propertyId: string | null, currency: string) {
  return useQuery<EligibleJobDto[], ApiError>({
    queryKey: ["bills", "eligible-jobs", propertyId, currency],
    queryFn: () =>
      api<EligibleJobDto[]>(
        `/api/bills/eligible-jobs?propertyId=${propertyId}&currency=${currency}`,
      ),
    enabled: !!propertyId,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation<BillDto, ApiError, CreateBillPayload>({
    mutationFn: (payload) =>
      api<BillDto>("/api/bills", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
  });
}

/** A mutation that returns the refreshed bill; keeps the cache in sync. */
function useBillMutation<TPayload>(
  id: string,
  fn: (payload: TPayload) => Promise<BillDto>,
) {
  const queryClient = useQueryClient();
  return useMutation<BillDto, ApiError, TPayload>({
    mutationFn: fn,
    onSuccess: (bill) => {
      queryClient.setQueryData(["bills", id], bill);
      void queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
  });
}

export function useUpdateBill(id: string) {
  return useBillMutation<UpdateBillPayload>(id, (payload) =>
    api<BillDto>(`/api/bills/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  );
}

export function useAddJobLines(id: string) {
  return useBillMutation<AddJobLinesPayload>(id, (payload) =>
    api<BillDto>(`/api/bills/${id}/jobs`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export function useAddLineItem(id: string) {
  return useBillMutation<AddLineItemPayload>(id, (payload) =>
    api<BillDto>(`/api/bills/${id}/line-items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export function useUpdateLineItem(id: string) {
  return useBillMutation<{ lineId: string; payload: UpdateLineItemPayload }>(
    id,
    ({ lineId, payload }) =>
      api<BillDto>(`/api/bills/${id}/line-items/${lineId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  );
}

export function useDeleteLineItem(id: string) {
  return useBillMutation<string>(id, (lineId) =>
    api<BillDto>(`/api/bills/${id}/line-items/${lineId}`, {
      method: "DELETE",
    }),
  );
}

export function useConfirmBill(id: string) {
  return useBillMutation<void>(id, () =>
    api<BillDto>(`/api/bills/${id}/confirm`, { method: "POST" }),
  );
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) =>
      api<void>(`/api/bills/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
  });
}

/** Download a confirmed bill's PDF via the authenticated cookie session. */
export async function downloadBillPdf(bill: BillDto): Promise<void> {
  const res = await fetch(`/api/bills/${bill.id}/pdf`, {
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new ApiError(res.status, "Failed to download PDF");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${bill.number ?? "bill"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
