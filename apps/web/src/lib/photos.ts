"use client";

import type { ChecklistItemDto, JobPhotoDto, PhotoKind } from "@domar/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "./api-client";
import { resizeImage } from "./image-resize";

export function useToggleChecklistItem(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<ChecklistItemDto, ApiError, { id: string; done: boolean }>(
    {
      mutationFn: ({ id, done }) =>
        api<ChecklistItemDto>(`/api/checklist-items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ done }),
        }),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: ["jobs", jobId] }),
    },
  );
}

export interface UploadPhotoInput {
  file: File;
  kind: PhotoKind;
  caption?: string;
  checklistItemId?: string;
}

export function useUploadPhoto(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<JobPhotoDto, ApiError, UploadPhotoInput>({
    mutationFn: async ({ file, kind, caption, checklistItemId }) => {
      const resized = await resizeImage(file);
      const form = new FormData();
      form.append("file", resized, "photo.jpg");
      form.append("kind", kind);
      if (caption) form.append("caption", caption);
      if (checklistItemId) form.append("checklistItemId", checklistItemId);
      return api<JobPhotoDto>(`/api/jobs/${jobId}/photos`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] }),
  });
}
