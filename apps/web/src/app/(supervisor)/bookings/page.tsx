"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDayHeading, formatTimeRange, localDayKey } from "@/lib/dates";
import {
  useBookings,
  useCreateBooking,
  useDeleteBooking,
} from "@/lib/bookings";
import { useProperties } from "@/lib/jobs";

export default function BookingsPage() {
  const t = useTranslations("bookings");
  const { data: bookings, isPending } = useBookings();
  const { data: properties } = useProperties();
  const createBooking = useCreateBooking();
  const deleteBooking = useDeleteBooking();

  const [propertyId, setPropertyId] = useState("");
  const [checkoutAt, setCheckoutAt] = useState("");
  const [checkinAt, setCheckinAt] = useState("");
  const [guestNote, setGuestNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createBooking.mutate(
      {
        propertyId,
        checkoutAt: new Date(checkoutAt).toISOString(),
        checkinAt: checkinAt ? new Date(checkinAt).toISOString() : undefined,
        guestNote: guestNote || undefined,
      },
      {
        onSuccess: () => {
          setCheckoutAt("");
          setCheckinAt("");
          setGuestNote("");
        },
      },
    );
  }

  const input =
    "rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none focus:border-neutral-800";

  const turnoverHref = (b: NonNullable<typeof bookings>[number]) => {
    if (!b.suggestion) return "#";
    const params = new URLSearchParams({
      propertyId: b.propertyId,
      type: "CLEANING",
      title: t("turnoverTitle"),
      start: b.suggestion.start,
      end: b.suggestion.end,
      bookingId: b.id,
    });
    return `/jobs/new?${params}`;
  };

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>

      <form
        onSubmit={submit}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3"
      >
        <h2 className="font-semibold">{t("add")}</h2>
        <select
          required
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className={input}
        >
          <option value="" disabled>
            {t("selectProperty")}
          </option>
          {(properties ?? [])
            .filter((p) => p.isActive)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("checkout")}
            <input
              type="datetime-local"
              required
              value={checkoutAt}
              onChange={(e) => setCheckoutAt(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("nextCheckin")}
            <input
              type="datetime-local"
              value={checkinAt}
              onChange={(e) => setCheckinAt(e.target.value)}
              className={input}
            />
          </label>
        </div>
        <input
          value={guestNote}
          onChange={(e) => setGuestNote(e.target.value)}
          placeholder={t("guestNote")}
          className={input}
        />
        {createBooking.isError && (
          <p role="alert" className="text-sm text-red-600">
            {createBooking.error.message}
          </p>
        )}
        <button
          type="submit"
          disabled={createBooking.isPending}
          className="rounded-lg bg-neutral-900 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {t("addBooking")}
        </button>
      </form>

      {isPending && <p className="text-neutral-400">…</p>}
      {!isPending && bookings?.length === 0 && (
        <p className="py-8 text-center text-neutral-400">{t("empty")}</p>
      )}
      <div className="flex flex-col gap-3">
        {bookings?.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-neutral-200 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{b.property.name}</h3>
              <button
                onClick={() => deleteBooking.mutate(b.id)}
                className="text-xs text-neutral-400 underline"
              >
                {t("remove")}
              </button>
            </div>
            <p className="text-sm text-neutral-600">
              {t("checkoutLine", {
                day: formatDayHeading(localDayKey(b.checkoutAt)),
              })}
              {b.checkinAt &&
                ` · ${t("checkinLine", { day: formatDayHeading(localDayKey(b.checkinAt)) })}`}
            </p>
            {b.guestNote && (
              <p className="text-sm text-neutral-400">{b.guestNote}</p>
            )}

            {b.suggestion && (
              <div
                className={`mt-2 flex items-center justify-between gap-2 rounded-lg p-2 text-sm ${
                  b.suggestion.tightGap ? "bg-orange-50" : "bg-blue-50"
                }`}
              >
                <span>
                  {b.suggestion.tightGap && "⚠ "}
                  {t("suggested", {
                    range: formatTimeRange(b.suggestion.start, b.suggestion.end),
                  })}
                </span>
                <Link
                  href={turnoverHref(b)}
                  className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {t("createTurnover")}
                </Link>
              </div>
            )}
            {b.turnoverJobId && (
              <Link
                href={`/jobs/${b.turnoverJobId}`}
                className="mt-2 inline-block text-sm font-medium text-blue-600"
              >
                {t("viewTurnover")} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
