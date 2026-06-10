"use client";

import type { JobDto } from "@domar/shared";
import { useTranslations } from "next-intl";
import { Camera, ListChecks } from "lucide-react";
import { useToggleChecklistItem, useUploadPhoto } from "@/lib/photos";
import { PhotoCapture } from "./PhotoCapture";
import { Card } from "@/components/ui";

export function JobChecklist({
  job,
  readOnly,
}: {
  job: JobDto;
  readOnly: boolean;
}) {
  const t = useTranslations("checklist");
  const toggle = useToggleChecklistItem(job.id);
  const upload = useUploadPhoto(job.id);

  if (job.checklistItems.length === 0) return null;

  const photosFor = (itemId: string) =>
    job.photos.filter((p) => p.checklistItemId === itemId);

  const doneCount = job.checklistItems.filter((i) => i.done).length;
  const total = job.checklistItems.length;
  const pct = total ? (doneCount / total) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-fg">
          <ListChecks size={16} className="text-subtle" aria-hidden />
          {t("title")}
        </h2>
        <span className="text-sm font-medium tabular-nums text-muted">
          {doneCount}/{total}
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-pill bg-surface-2">
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-300 ease-domar"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="flex flex-col gap-1">
        {job.checklistItems.map((item) => (
          <li key={item.id} className="flex flex-col gap-1">
            <label className="flex min-h-[44px] items-start gap-3 rounded-md py-1.5 active:bg-surface-2">
              <input
                type="checkbox"
                checked={item.done}
                disabled={readOnly || toggle.isPending}
                onChange={(e) =>
                  toggle.mutate({ id: item.id, done: e.target.checked })
                }
                className="mt-0.5 size-5 shrink-0 accent-accent"
              />
              <span
                className={`text-base ${
                  item.done ? "text-subtle line-through" : "text-fg"
                }`}
              >
                {item.text}
                {item.photoRequired && (
                  <Camera
                    size={14}
                    className="ml-1.5 inline align-text-bottom text-st-progress"
                    aria-hidden
                  />
                )}
              </span>
            </label>
            {item.photoRequired && !readOnly && (
              <div className="ml-8">
                {photosFor(item.id).length === 0 ? (
                  <PhotoCapture
                    label={t("photoNeeded")}
                    disabled={upload.isPending}
                    onPick={(file) =>
                      upload.mutate({
                        file,
                        kind: "AFTER",
                        checklistItemId: item.id,
                      })
                    }
                  />
                ) : (
                  <div className="flex gap-2">
                    {photosFor(item.id).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={`/api/photos/${p.id}`}
                        alt={item.text}
                        className="size-16 rounded-md border border-border object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {upload.isError && (
        <p role="alert" className="mt-2 text-sm text-st-declined">
          {upload.error.message}
        </p>
      )}
    </Card>
  );
}
