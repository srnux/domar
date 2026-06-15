"use client";

import type {
  ChecklistItemDto,
  JobDto,
  JobPhotoDto,
  PhotoKind,
} from "@domar/shared";
import {
  onlineManager,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api } from "./api-client";
import { blobToDataUrl, resizeImage } from "./image-resize";
import { enqueue, isNetworkError } from "./outbox";

export function useToggleChecklistItem(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    ChecklistItemDto | null,
    ApiError,
    { id: string; done: boolean },
    { previous?: JobDto }
  >({
    mutationFn: async ({ id, done }) => {
      const queueIt = () =>
        enqueue({ kind: "checklist", jobId, itemId: id, done });
      if (!onlineManager.isOnline()) {
        await queueIt();
        return null;
      }
      try {
        return await api<ChecklistItemDto>(`/api/checklist-items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ done }),
        });
      } catch (err) {
        if (isNetworkError(err)) {
          await queueIt();
          return null;
        }
        throw err;
      }
    },
    // Optimistically tick the item; roll back if the server rejects.
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: ["jobs", jobId] });
      const previous = queryClient.getQueryData<JobDto>(["jobs", jobId]);
      if (previous) {
        queryClient.setQueryData<JobDto>(["jobs", jobId], {
          ...previous,
          checklistItems: previous.checklistItems.map((i) =>
            i.id === id ? { ...i, done } : i,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["jobs", jobId], context.previous);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] }),
  });
}

export interface UploadPhotoInput {
  file: File;
  kind: PhotoKind;
  caption?: string;
  checklistItemId?: string;
}

export function useUploadPhoto(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<JobPhotoDto | null, ApiError, UploadPhotoInput>({
    mutationFn: async ({ file, kind, caption, checklistItemId }) => {
      const resized = await resizeImage(file);
      const queueIt = async () =>
        enqueue({
          kind: "photo",
          jobId,
          dataUrl: await blobToDataUrl(resized),
          photoKind: kind,
          caption,
          checklistItemId,
        });
      const doUpload = () => {
        const form = new FormData();
        form.append("file", resized, "photo.jpg");
        form.append("kind", kind);
        if (caption) form.append("caption", caption);
        if (checklistItemId) form.append("checklistItemId", checklistItemId);
        return api<JobPhotoDto>(`/api/jobs/${jobId}/photos`, {
          method: "POST",
          body: form,
        });
      };
      if (!onlineManager.isOnline()) {
        await queueIt();
        return null;
      }
      try {
        return await doUpload();
      } catch (err) {
        if (isNetworkError(err)) {
          await queueIt();
          return null;
        }
        throw err;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] }),
  });
}
