"use client";

import type {
  BookingDto,
  CreateBookingPayload,
  UpdateBookingPayload,
} from "@domar/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api } from "./api-client";

export function useBookings() {
  return useQuery<BookingDto[], ApiError>({
    queryKey: ["bookings"],
    queryFn: () => api<BookingDto[]>("/api/bookings"),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation<BookingDto, ApiError, CreateBookingPayload>({
    mutationFn: (payload) =>
      api<BookingDto>("/api/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation<
    BookingDto,
    ApiError,
    { id: string } & UpdateBookingPayload
  >({
    mutationFn: ({ id, ...payload }) =>
      api<BookingDto>(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation<{ ok: true }, ApiError, string>({
    mutationFn: (id) =>
      api<{ ok: true }>(`/api/bookings/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
