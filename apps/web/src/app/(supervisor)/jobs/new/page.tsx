"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { JobType } from "@domar/shared";
import { useCreateJob, useProperties, useWorkers } from "@/lib/jobs";

export default function NewJobPage() {
  const t = useTranslations("supervisor");
  const tj = useTranslations("jobType");
  const router = useRouter();
  const { data: properties } = useProperties();
  const { data: workers } = useWorkers();
  const createJob = useCreateJob();

  const [propertyId, setPropertyId] = useState("");
  const [type, setType] = useState<JobType>("CLEANING");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("13:00");
  const [workerId, setWorkerId] = useState("");

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
      { onSuccess: () => router.push("/dashboard") },
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
            {(workers ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.skills.map((s) => tj(s as never)).join(", ")})
              </option>
            ))}
          </select>
        </label>

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
