"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { JobType } from "@domar/shared";
import { TriangleAlert } from "lucide-react";
import { findConflicts, workerMatchesJobType } from "@/lib/assign";
import { useUpdateBooking } from "@/lib/bookings";
import { formatTimeRange } from "@/lib/dates";
import { useCreateJob, useJobs, useProperties, useWorkers } from "@/lib/jobs";
import { EMPTY_PRICING, pricingToPayload, type PricingFormValue } from "@/lib/pricing";
import { PricingFields } from "@/components/PricingFields";
import {
  Button,
  Callout,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";

function toLocalInput(iso: string, part: "date" | "time"): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return part === "date"
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NewJobForm() {
  const t = useTranslations("supervisor");
  const tj = useTranslations("jobType");
  const router = useRouter();
  const params = useSearchParams();
  const { data: properties } = useProperties();
  const { data: workers } = useWorkers();
  const { data: allJobs } = useJobs();
  const createJob = useCreateJob();
  const linkBooking = useUpdateBooking();

  const prefillStart = params.get("start");
  const prefillEnd = params.get("end");
  const bookingId = params.get("bookingId");

  const [propertyId, setPropertyId] = useState(params.get("propertyId") ?? "");
  const [type, setType] = useState<JobType>(
    (params.get("type") as JobType) ?? "CLEANING",
  );
  const [title, setTitle] = useState(params.get("title") ?? "");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(
    prefillStart ? toLocalInput(prefillStart, "date") : "",
  );
  const [startTime, setStartTime] = useState(
    prefillStart ? toLocalInput(prefillStart, "time") : "10:00",
  );
  const [endTime, setEndTime] = useState(
    prefillEnd ? toLocalInput(prefillEnd, "time") : "13:00",
  );
  const [workerId, setWorkerId] = useState("");
  const [pricing, setPricing] = useState<PricingFormValue>(EMPTY_PRICING);

  const eligibleWorkers = useMemo(
    () => (workers ?? []).filter((w) => workerMatchesJobType(w, type)),
    [workers, type],
  );

  const conflicts = useMemo(() => {
    if (!workerId || !date) return [];
    return findConflicts(
      allJobs ?? [],
      workerId,
      new Date(`${date}T${startTime}`).toISOString(),
      new Date(`${date}T${endTime}`).toISOString(),
    );
  }, [allJobs, workerId, date, startTime, endTime]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    createJob.mutate(
      {
        propertyId,
        type,
        title,
        description: description || undefined,
        scheduledStart: new Date(`${date}T${startTime}`).toISOString(),
        scheduledEnd: new Date(`${date}T${endTime}`).toISOString(),
        // A negotiable job is assigned by accepting a bid, not up front.
        assignedWorkerId:
          pricing.priceType === "NEGOTIABLE" ? undefined : workerId || undefined,
        ...pricingToPayload(pricing),
      },
      {
        onSuccess: (job) => {
          if (bookingId) {
            linkBooking.mutate({ id: bookingId, turnoverJobId: job.id });
          }
          router.push("/dashboard");
        },
      },
    );
  }

  return (
    <main className="mx-auto max-w-xl p-4">
      <PageHeader title={t("newJob")} />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t("property")}>
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
        </Field>

        <Field label={t("type")}>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as JobType)}
          >
            {Object.values(JobType).map((jt) => (
              <option key={jt} value={jt}>
                {tj(jt)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("title")}>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label={t("description")}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label={t("date")}>
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label={t("from")}>
            <Input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field label={t("to")}>
            <Input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label={t("assignWorker")}
          hint={
            workers && eligibleWorkers.length < workers.length
              ? t("skillFiltered", { type: tj(type) })
              : undefined
          }
        >
          <Select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
          >
            <option value="">{t("leaveUnassigned")}</option>
            {eligibleWorkers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.skills.map((s) => tj(s as never)).join(", ")})
              </option>
            ))}
          </Select>
        </Field>

        <PricingFields value={pricing} onChange={setPricing} allowNegotiable />

        {conflicts.length > 0 && (
          <Callout
            variant="warning"
            icon={<TriangleAlert size={16} aria-hidden />}
            title={t("conflictHint", { count: conflicts.length })}
          >
            <ul className="mt-1 list-inside list-disc">
              {conflicts.map((c) => (
                <li key={c.id} className="tabular-nums">
                  {c.title} ·{" "}
                  {formatTimeRange(c.scheduledStart, c.scheduledEnd)}
                </li>
              ))}
            </ul>
          </Callout>
        )}

        {createJob.isError && (
          <p role="alert" className="text-sm text-st-declined">
            {createJob.error.message}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={createJob.isPending}
          loading={createJob.isPending}
        >
          {createJob.isPending ? t("creating") : t("createJob")}
        </Button>
      </form>
    </main>
  );
}

export default function NewJobPage() {
  return (
    <Suspense>
      <NewJobForm />
    </Suspense>
  );
}
