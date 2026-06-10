"use client";

import type { JobDto } from "@domar/shared";
import { useTranslations } from "next-intl";
import { useToggleChecklistItem, useUploadPhoto } from "@/lib/photos";
import { PhotoCapture } from "./PhotoCapture";

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

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-3">
      <h2 className="mb-2 font-semibold">
        {t("title")} (
        {job.checklistItems.filter((i) => i.done).length}/
        {job.checklistItems.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {job.checklistItems.map((item) => (
          <li key={item.id} className="flex flex-col gap-1">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={item.done}
                disabled={readOnly || toggle.isPending}
                onChange={(e) =>
                  toggle.mutate({ id: item.id, done: e.target.checked })
                }
                className="mt-1 h-4 w-4"
              />
              <span
                className={`text-sm ${item.done ? "text-neutral-400 line-through" : ""}`}
              >
                {item.text}
                {item.photoRequired && (
                  <span className="ml-1 text-amber-600">📷</span>
                )}
              </span>
            </label>
            {item.photoRequired && !readOnly && (
              <div className="ml-6">
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
                        className="h-16 w-16 rounded-lg object-cover"
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
        <p role="alert" className="mt-2 text-sm text-red-600">
          {upload.error.message}
        </p>
      )}
    </section>
  );
}
