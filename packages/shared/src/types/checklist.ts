import type { PhotoKind } from '../enums';

export interface ChecklistItemDto {
  id: string;
  text: string;
  photoRequired: boolean;
  done: boolean;
  sortOrder: number;
}

export interface JobPhotoDto {
  id: string;
  kind: PhotoKind;
  caption: string | null;
  checklistItemId: string | null;
  uploadedById: string | null;
  createdAt: string;
}

export interface ChecklistTemplateItemDto {
  id: string;
  text: string;
  photoRequired: boolean;
  sortOrder: number;
}

export interface UpsertChecklistTemplatePayload {
  items: Array<{
    text: string;
    photoRequired?: boolean;
  }>;
}
