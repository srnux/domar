import type { CommentVisibility, Role } from '../enums';

export interface JobCommentDto {
  id: string;
  body: string;
  visibility: CommentVisibility;
  createdAt: string;
  author: { id: string; name: string; role: Role } | null;
}

export interface CreateCommentPayload {
  body: string;
  visibility: CommentVisibility;
}
