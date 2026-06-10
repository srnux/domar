"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Plus, Sparkles, TriangleAlert } from "lucide-react";
import { formatDayHeading, formatTimeRange, localDayKey } from "@/lib/dates";
import {
  useBookings,
  useCreateBooking,
  useDeleteBooking,
} from "@/lib/bookings";
import { useProperties } from "@/lib/jobs";
import {
  Button,
  buttonClass,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PageSpinner,
  Select,
} from "@/components/ui";

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
      <PageHeader title={t("title")} />

      <Card className="mb-6 p-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <h2 className="font-semibold text-fg">{t("add")}</h2>
          <Select
            required
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
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
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("checkout")}>
              <Input
                type="datetime-local"
                required
                value={checkoutAt}
                onChange={(e) => setCheckoutAt(e.target.value)}
              />
            </Field>
            <Field label={t("nextCheckin")}>
              <Input
                type="datetime-local"
                value={checkinAt}
                onChange={(e) => setCheckinAt(e.target.value)}
              />
            </Field>
          </div>
          <Input
            value={guestNote}
            onChange={(e) => setGuestNote(e.target.value)}
            placeholder={t("guestNote")}
          />
          {createBooking.isError && (
            <p role="alert" className="text-sm text-st-declined">
              {createBooking.error.message}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={createBooking.isPending}
            loading={createBooking.isPending}
          >
            <Plus size={16} aria-hidden /> {t("addBooking")}
          </Button>
        </form>
      </Card>

      {isPending && <PageSpinner />}
      {!isPending && bookings?.length === 0 && (
        <EmptyState
          icon={<ArrowRight size={22} aria-hidden />}
          title={t("empty")}
        />
      )}
      <div className="flex flex-col gap-3">
        {bookings?.map((b) => {
          const tight = b.suggestion?.tightGap;
          return (
            <Card
              key={b.id}
              className={`p-4 ${
                tight ? "border-l-[3px] border-l-warn-line" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-fg">{b.property.name}</h3>
                <button
                  onClick={() => deleteBooking.mutate(b.id)}
                  className="text-xs font-medium text-subtle hover:text-st-declined hover:underline"
                >
                  {t("remove")}
                </button>
              </div>
              <p className="text-sm text-fg-soft">
                {t("checkoutLine", {
                  day: formatDayHeading(localDayKey(b.checkoutAt)),
                })}
                {b.checkinAt &&
                  ` · ${t("checkinLine", { day: formatDayHeading(localDayKey(b.checkinAt)) })}`}
              </p>
              {b.guestNote && (
                <p className="text-sm text-muted">{b.guestNote}</p>
              )}

              {b.suggestion && (
                <div
                  className={`mt-3 flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm ${
                    tight
                      ? "border-warn-line/60 bg-warn-bg text-warn-fg"
                      : "border-info-line bg-info-soft text-info-fg"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {tight ? (
                      <TriangleAlert size={16} aria-hidden className="shrink-0" />
                    ) : (
                      <Sparkles size={16} aria-hidden className="shrink-0" />
                    )}
                    {t("suggested", {
                      range: formatTimeRange(
                        b.suggestion.start,
                        b.suggestion.end,
                      ),
                    })}
                  </span>
                  <Link
                    href={turnoverHref(b)}
                    className={buttonClass({ variant: "primary", size: "sm" })}
                  >
                    {t("createTurnover")}
                  </Link>
                </div>
              )}
              {b.turnoverJobId && (
                <Link
                  href={`/jobs/${b.turnoverJobId}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent-fg hover:underline"
                >
                  {t("viewTurnover")} <ArrowRight size={14} aria-hidden />
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
