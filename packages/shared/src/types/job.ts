import type { JobPriority, JobStatus, JobType } from '../enums';
import type { ChecklistItemDto, JobPhotoDto } from './checklist';

export interface JobPropertyDto {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  accessNotes: string | null;
}

export interface JobWorkerDto {
  id: string;
  name: string;
}

export interface JobDto {
  id: string;
  property: JobPropertyDto;
  type: JobType;
  title: string;
  description: string | null;
  status: JobStatus;
  priority: JobPriority;
  scheduledStart: string;
  scheduledEnd: string;
  assignedWorker: JobWorkerDto | null;
  statusReason: string | null;
  workerNotes: string | null;
  /** Status values the requesting user may move this job to. */
  allowedTransitions: JobStatus[];
  checklistItems: ChecklistItemDto[];
  photos: JobPhotoDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPayload {
  propertyId: string;
  type: JobType;
  title: string;
  description?: string;
  scheduledStart: string;
  scheduledEnd: string;
  assignedWorkerId?: string;
  priority?: JobPriority;
}

export interface TransitionJobPayload {
  to: JobStatus;
  reason?: string;
  /** Required when entering ASSIGNED from DRAFT/DECLINED; optional on reopen. */
  assignedWorkerId?: string;
  /** Worker's closing notes, accepted when finishing a job. */
  workerNotes?: string;
}
