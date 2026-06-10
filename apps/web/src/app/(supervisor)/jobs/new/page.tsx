"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { JobType } from "@domar/shared";
import { findConflicts, workerMatchesJobType } from "@/lib/assign";
import { useUpdateBooking } from "@/lib/bookings";
import { formatTimeRange } from "@/lib/dates";
import { useCreateJob, useJobs, useProperties, useWorkers } from "@/lib/jobs";

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
        assignedWorkerId: workerId || undefined,
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

  const input =
    "rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-800 bg-white";

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{t("newJob")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("property")}
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
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("type")}
          <select
            value={type}
            onChange={(e) => setType(e.target.value as JobType)}
            className={input}
          >
            {Object.values(JobType).map((jt) => (
              <option key={jt} value={jt}>
                {tj(jt)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("title")}
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("description")}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={input}
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("date")}
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("from")}
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("to")}
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={input}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("assignWorker")}
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className={input}
          >
            <option value="">{t("leaveUnassigned")}</option>
            {eligibleWorkers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.skills.map((s) => tj(s as never)).join(", ")})
              </option>
            ))}
          </select>
          {workers && eligibleWorkers.length < workers.length && (
            <span className="text-xs text-neutral-400">
              {t("skillFiltered", { type: tj(type) })}
            </span>
          )}
        </label>

        {conflicts.length > 0 && (
          <div className="rounded-lg bg-orange-50 p-2 text-sm text-orange-700">
            ⚠{" "}
            {t("conflictHint", { count: conflicts.length })}
            <ul className="mt-1 list-inside list-disc">
              {conflicts.map((c) => (
                <li key={c.id}>
                  {c.title} ·{" "}
                  {formatTimeRange(c.scheduledStart, c.scheduledEnd)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {createJob.isError && (
          <p role="alert" className="text-sm text-red-600">
            {createJob.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={createJob.isPending}
          className="rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50"
        >
          {createJob.isPending ? t("creating") : t("createJob")}
        </button>
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
