"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, KeyRound, MapPin } from "lucide-react";
import { CommentThread } from "@/components/CommentThread";
import { JobChecklist } from "@/components/JobChecklist";
import { JobPhotos } from "@/components/JobPhotos";
import { JobPriceCard } from "@/components/JobPriceCard";
import { PriceTypeBadge } from "@/components/PriceTypeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { JobTypeIcon } from "@/components/JobTypeIcon";
import { formatTimeRange, localDayKey, formatDayHeading } from "@/lib/dates";
import { useJob, useTransitionJob } from "@/lib/jobs";
import {
  Button,
  Callout,
  Card,
  Field,
  Input,
  PageSpinner,
  Textarea,
} from "@/components/ui";

export default function WorkerJobPage() {
  const { id = "" } = useParams<{ id: string }>();
  const t = useTranslations("worker");
  const tj = useTranslations("jobType");
  const tp = useTranslations("pricing");
  const router = useRouter();
  const { data: job, isPending } = useJob(id);
  const transition = useTransitionJob(id);

  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);
  const [notes, setNotes] = useState("");
  const [spentHours, setSpentHours] = useState("");
  const [showFinish, setShowFinish] = useState(false);

  if (isPending || !job) {
    return <PageSpinner />;
  }

  const can = (s: string) => job.allowedTransitions.includes(s as never);
  const mapsUrl =
    job.property.lat != null && job.property.lng != null
      ? `https://maps.google.com/?q=${job.property.lat},${job.property.lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(job.property.address)}`;

  const act = (payload: Parameters<typeof transition.mutate>[0]) =>
    transition.mutate(payload, {
      onSuccess: () => {
        setShowDecline(false);
        setShowFinish(false);
      },
    });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden /> {t("back")}
      </button>

      <div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              <JobTypeIcon type={job.type} size={14} className="text-subtle" />
              {tj(job.type)}
            </span>
            <PriceTypeBadge job={job} />
          </span>
          <StatusBadge status={job.status} />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {job.title}
        </h1>
        <p className="text-sm tabular-nums text-muted">
          {formatDayHeading(localDayKey(job.scheduledStart))} ·{" "}
          {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
        </p>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold text-fg">{job.property.name}</h2>
        <p className="text-sm text-fg-soft">{job.property.address}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent-fg hover:underline"
        >
          <MapPin size={15} aria-hidden /> {t("openInMaps")}
          <ExternalLink size={13} aria-hidden />
        </a>
        {job.property.accessNotes && (
          <Callout
            variant="access"
            className="mt-3"
            icon={<KeyRound size={18} aria-hidden />}
            title={t("access")}
          >
            <p className="text-base font-medium leading-relaxed whitespace-pre-wrap">
              {job.property.accessNotes}
            </p>
          </Callout>
        )}
      </Card>

      {job.description && (
        <Card className="p-4 text-sm text-fg-soft">{job.description}</Card>
      )}

      <JobPriceCard job={job} />

      <JobChecklist
        job={job}
        readOnly={job.status !== "IN_PROGRESS" && job.status !== "ACCEPTED"}
      />
      {(job.status === "IN_PROGRESS" || job.photos.length > 0) && (
        <JobPhotos job={job} canUpload={job.status === "IN_PROGRESS"} />
      )}

      {job.statusReason && job.status === "ASSIGNED" && (
        <Callout variant="warning">
          {t("reopenedNote", { reason: job.statusReason })}
        </Callout>
      )}

      <CommentThread jobId={job.id} canChooseVisibility />

      {transition.isError && (
        <p role="alert" className="text-sm text-st-declined">
          {transition.error.message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {can("ACCEPTED") && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => act({ to: "ACCEPTED" })}
            disabled={transition.isPending}
          >
            {t("accept")}
          </Button>
        )}
        {can("DECLINED") && !showDecline && (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => setShowDecline(true)}
          >
            {t("decline")}
          </Button>
        )}
        {showDecline && (
          <div className="flex flex-col gap-2 rounded-md border border-st-declined/30 bg-st-declined-soft p-3">
            <label className="text-sm font-medium text-st-declined">
              {t("declineReason")}
            </label>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <Button
              variant="warning"
              size="lg"
              fullWidth
              onClick={() => act({ to: "DECLINED", reason: declineReason })}
              disabled={!declineReason.trim() || transition.isPending}
            >
              {t("confirmDecline")}
            </Button>
          </div>
        )}
        {can("IN_PROGRESS") && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => act({ to: "IN_PROGRESS" })}
            disabled={transition.isPending}
          >
            {t("start")}
          </Button>
        )}
        {can("DONE") && !showFinish && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setShowFinish(true)}
          >
            {t("finish")}
          </Button>
        )}
        {showFinish && (
          <div className="flex flex-col gap-2 rounded-md border border-accent-line bg-accent-soft p-3">
            {job.priceType === "HOURLY" && (
              <Field label={tp("spentHours")} hint={tp("spentHoursHint")}>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={spentHours}
                  onChange={(e) => setSpentHours(e.target.value)}
                />
              </Field>
            )}
            <label className="text-sm font-medium text-accent-fg">
              {t("finishNotes")}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() =>
                act({
                  to: "DONE",
                  workerNotes: notes,
                  spentHours:
                    job.priceType === "HOURLY" && spentHours.trim() !== ""
                      ? parseFloat(spentHours)
                      : undefined,
                })
              }
              disabled={transition.isPending}
            >
              {t("confirmFinish")}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
