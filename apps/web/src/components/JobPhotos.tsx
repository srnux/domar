"use client";

import { useState } from "react";
import type { JobDto, PhotoKind } from "@domar/shared";
import { useTranslations } from "next-intl";
import { useUploadPhoto } from "@/lib/photos";
import { PhotoCapture } from "./PhotoCapture";

function PhotoRow({ job, kind }: { job: JobDto; kind: PhotoKind }) {
  const photos = job.photos.filter(
    (p) => p.kind === kind && !p.checklistItemId,
  );
  if (photos.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.id}
          src={`/api/photos/${p.id}`}
          alt={p.caption ?? kind}
          title={p.caption ?? undefined}
          className="h-20 w-20 rounded-lg object-cover"
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
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3">
      <h2 className="font-semibold">{t("title")}</h2>

      {(["BEFORE", "AFTER", "ISSUE"] as const).map((kind) => (
        <div key={kind} className="flex flex-col gap-1">
          {job.photos.some((p) => p.kind === kind && !p.checklistItemId) && (
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              {t(kind)}
            </span>
          )}
          <PhotoRow job={job} kind={kind} />
        </div>
      ))}

      {canUpload && (
        <>
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
              className="self-start text-sm font-medium text-orange-600"
            >
              ⚠ {t("flagIssue")}
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
              <label className="text-sm font-medium text-orange-800">
                {t("issueNote")}
              </label>
              <textarea
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                rows={2}
                className="rounded-lg border border-neutral-300 p-2 text-sm"
              />
              <PhotoCapture
                label={issueFile ? `✓ ${issueFile.name}` : t("issuePhoto")}
                disabled={upload.isPending}
                onPick={setIssueFile}
              />
              <button
                type="button"
                disabled={!issueFile || !issueNote.trim() || upload.isPending}
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
                className="rounded-lg bg-orange-600 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {t("submitIssue")}
              </button>
            </div>
          )}
        </>
      )}

      {upload.isError && (
        <p role="alert" className="text-sm text-red-600">
          {upload.error.message}
        </p>
      )}
    </section>
  );
}
