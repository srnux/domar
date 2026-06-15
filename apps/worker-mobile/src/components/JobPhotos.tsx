"use client";

import { useState } from "react";
import type { JobDto, PhotoKind } from "@domar/shared";
import { useTranslations } from "next-intl";
import { Check, ImageIcon, TriangleAlert } from "lucide-react";
import { useUploadPhoto } from "@/lib/photos";
import { AuthImage } from "./AuthImage";
import { PhotoCapture } from "./PhotoCapture";
import { Button, Card, Textarea } from "@/components/ui";

function PhotoRow({ job, kind }: { job: JobDto; kind: PhotoKind }) {
  const photos = job.photos.filter(
    (p) => p.kind === kind && !p.checklistItemId,
  );
  if (photos.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p) => (
        <AuthImage
          key={p.id}
          photoId={p.id}
          alt={p.caption ?? kind}
          title={p.caption ?? undefined}
          className="size-20 rounded-md border border-border object-cover"
        />
      ))}
    </div>
  );
}

export function JobPhotos({
  job,
  canUpload,
}: {
  job: JobDto;
  canUpload: boolean;
}) {
  const t = useTranslations("photos");
  const upload = useUploadPhoto(job.id);
  const [issueNote, setIssueNote] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const [issueFile, setIssueFile] = useState<File | null>(null);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-fg">
        <ImageIcon size={16} className="text-subtle" aria-hidden />
        {t("title")}
      </h2>

      {(["BEFORE", "AFTER", "ISSUE"] as const).map((kind) => (
        <div key={kind} className="flex flex-col gap-1.5">
          {job.photos.some((p) => p.kind === kind && !p.checklistItemId) && (
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {t(kind)}
            </span>
          )}
          <PhotoRow job={job} kind={kind} />
        </div>
      ))}

      {canUpload && (
        <div className="flex flex-col gap-3">
          <PhotoCapture
            label={t("BEFORE")}
            disabled={upload.isPending}
            onPick={(file) => upload.mutate({ file, kind: "BEFORE" })}
          />
          <PhotoCapture
            label={t("AFTER")}
            disabled={upload.isPending}
            onPick={(file) => upload.mutate({ file, kind: "AFTER" })}
          />

          {!showIssue ? (
            <button
              type="button"
              onClick={() => setShowIssue(true)}
              className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-st-declined hover:underline"
            >
              <TriangleAlert size={15} aria-hidden /> {t("flagIssue")}
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-md border border-st-declined/30 bg-st-declined-soft p-3">
              <label className="text-sm font-medium text-st-declined">
                {t("issueNote")}
              </label>
              <Textarea
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <PhotoCapture
                label={
                  issueFile ? (
                    <span className="inline-flex items-center gap-1">
                      <Check size={14} /> {issueFile.name}
                    </span>
                  ) : (
                    t("issuePhoto")
                  )
                }
                disabled={upload.isPending}
                onPick={setIssueFile}
              />
              <Button
                type="button"
                variant="warning"
                size="lg"
                fullWidth
                disabled={!issueFile || !issueNote.trim() || upload.isPending}
                loading={upload.isPending}
                onClick={() =>
                  issueFile &&
                  upload.mutate(
                    { file: issueFile, kind: "ISSUE", caption: issueNote },
                    {
                      onSuccess: () => {
                        setShowIssue(false);
                        setIssueNote("");
                        setIssueFile(null);
                      },
                    },
                  )
                }
              >
                {t("submitIssue")}
              </Button>
            </div>
          )}
        </div>
      )}

      {upload.isError && (
        <p role="alert" className="text-sm text-st-declined">
          {upload.error.message}
        </p>
      )}
    </Card>
  );
}
