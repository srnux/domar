"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, BadgeCheck, UserPlus } from "lucide-react";
import { CommentThread } from "@/components/CommentThread";
import { JobChecklist } from "@/components/JobChecklist";
import { JobPhotos } from "@/components/JobPhotos";
import { JobPriceCard } from "@/components/JobPriceCard";
import { PricingFields } from "@/components/PricingFields";
import { StatusBadge } from "@/components/StatusBadge";
import { JobTypeIcon } from "@/components/JobTypeIcon";
import { formatDayHeading, formatTimeRange, localDayKey } from "@/lib/dates";
import { useJob, useTransitionJob, useUpdateJob, useWorkers } from "@/lib/jobs";
import {
  EMPTY_PRICING,
  pricingFromJob,
  pricingToPayload,
  type PricingFormValue,
} from "@/lib/pricing";
import {
  Button,
  Callout,
  Card,
  PageSpinner,
  Select,
  Textarea,
} from "@/components/ui";

export default function SupervisorJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("supervisor");
  const tj = useTranslations("jobType");
  const tp = useTranslations("pricing");
  const router = useRouter();
  const { data: job, isPending } = useJob(id);
  const { data: workers } = useWorkers();
  const transition = useTransitionJob(id);
  const updateJob = useUpdateJob(id);

  const [workerId, setWorkerId] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [showReopen, setShowReopen] = useState(false);
  const [pricing, setPricing] = useState<PricingFormValue>(EMPTY_PRICING);
  const [editingPrice, setEditingPrice] = useState(false);

  if (isPending || !job) {
    return <PageSpinner />;
  }

  const can = (s: string) => job.allowedTransitions.includes(s as never);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden /> {t("back")}
      </button>

      <div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <JobTypeIcon type={job.type} size={14} className="text-subtle" />
            {tj(job.type)}
          </span>
          <StatusBadge status={job.status} />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {job.title}
        </h1>
        <p className="text-sm tabular-nums text-muted">
          {job.property.name} ·{" "}
          {formatDayHeading(localDayKey(job.scheduledStart))} ·{" "}
          {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
        </p>
        <p className="text-sm text-muted">
          {job.assignedWorker
            ? t("assignedTo", { name: job.assignedWorker.name })
            : t("unassigned")}
        </p>
      </div>

      {job.statusReason && (
        <Callout variant="warning">
          {t("lastReason", { reason: job.statusReason })}
        </Callout>
      )}
      {job.workerNotes && (
        <Card className="p-4 text-sm">
          <h2 className="mb-1 font-semibold text-fg">{t("workerNotes")}</h2>
          <p className="text-fg-soft">{job.workerNotes}</p>
        </Card>
      )}
      {job.description && (
        <Card className="p-4 text-sm text-fg-soft">{job.description}</Card>
      )}

      {(() => {
        const priceEditable =
          job.status === "DRAFT" || job.status === "ASSIGNED";
        if (priceEditable && editingPrice) {
          return (
            <Card className="flex flex-col gap-3 p-4">
              <PricingFields value={pricing} onChange={setPricing} />
              {updateJob.isError && (
                <p role="alert" className="text-sm text-st-declined">
                  {updateJob.error.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() =>
                    updateJob.mutate(pricingToPayload(pricing), {
                      onSuccess: () => setEditingPrice(false),
                    })
                  }
                  disabled={updateJob.isPending}
                  loading={updateJob.isPending}
                >
                  {tp("save")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditingPrice(false)}
                >
                  {t("cancel")}
                </Button>
              </div>
            </Card>
          );
        }
        return (
          <div className="flex flex-col gap-2">
            <JobPriceCard job={job} />
            {priceEditable && (
              <Button
                variant="secondary"
                onClick={() => {
                  setPricing(pricingFromJob(job));
                  setEditingPrice(true);
                }}
              >
                {job.priceType ? tp("edit") : tp("set")}
              </Button>
            )}
          </div>
        );
      })()}

      <JobChecklist job={job} readOnly />
      {job.photos.length > 0 && <JobPhotos job={job} canUpload={false} />}

      <CommentThread jobId={job.id} canChooseVisibility />

      {transition.isError && (
        <p role="alert" className="text-sm text-st-declined">
          {transition.error.message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {can("ASSIGNED") && job.status !== "DONE" && (
          <div className="flex flex-col gap-2 rounded-md border border-info-line bg-info-soft p-3">
            <label className="flex items-center gap-1.5 text-sm font-medium text-info-fg">
              <UserPlus size={15} aria-hidden />
              {job.status === "DECLINED" ? t("reassignTo") : t("assignTo")}
            </label>
            <Select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
            >
              <option value="">{t("selectWorker")}</option>
              {(workers ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() =>
                transition.mutate({ to: "ASSIGNED", assignedWorkerId: workerId })
              }
              disabled={!workerId || transition.isPending}
            >
              {t("assign")}
            </Button>
          </div>
        )}

        {can("VERIFIED") && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => transition.mutate({ to: "VERIFIED" })}
            disabled={transition.isPending}
          >
            <BadgeCheck size={18} aria-hidden /> {t("verify")}
          </Button>
        )}

        {job.status === "DONE" && !showReopen && (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => setShowReopen(true)}
          >
            {t("reopen")}
          </Button>
        )}
        {showReopen && (
          <div className="flex flex-col gap-2 rounded-md border border-warn-line/50 bg-warn-bg p-3">
            <label className="text-sm font-medium text-warn-fg">
              {t("reopenReason")}
            </label>
            <Textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <Button
              variant="warning"
              size="lg"
              fullWidth
              onClick={() =>
                transition.mutate(
                  { to: "ASSIGNED", reason: reopenReason },
                  { onSuccess: () => setShowReopen(false) },
                )
              }
              disabled={!reopenReason.trim() || transition.isPending}
            >
              {t("confirmReopen")}
            </Button>
          </div>
        )}

        {can("CANCELLED") && (
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={() => transition.mutate({ to: "CANCELLED" })}
            disabled={transition.isPending}
          >
            {t("cancelJob")}
          </Button>
        )}
      </div>
    </main>
  );
}
