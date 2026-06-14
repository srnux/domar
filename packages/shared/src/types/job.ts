import type { JobPriority, JobStatus, JobType, PriceType } from '../enums';
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

export interface JobRatingDto {
  /** 1–5 stars. */
  score: number;
  comment: string | null;
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
  /** Pricing (net, no tax). null = no price set. Visible to supervisor + assigned worker. */
  priceType: PriceType | null;
  /** Total (FIXED) or per-hour rate (HOURLY), in minor units (cents). */
  priceCents: number | null;
  currency: string;
  /** Optional supervisor estimate, HOURLY only. */
  estimatedHours: number | null;
  /** Worker-entered actual hours at finish, HOURLY only. */
  spentHours: number | null;
  /** Number of bids placed (relevant for OPEN negotiable jobs; 0 otherwise). */
  bidCount: number;
  /** Status values the requesting user may move this job to. */
  allowedTransitions: JobStatus[];
  checklistItems: ChecklistItemDto[];
  photos: JobPhotoDto[];
  /** Owner's rating of the finished work, once given. */
  rating: JobRatingDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface RateJobPayload {
  /** 1–5 stars. */
  score: number;
  comment?: string;
}

/** Pricing fields shared by create and update payloads. */
export interface JobPricingInput {
  /** FIXED or HOURLY in Phase 1; NEGOTIABLE is rejected until Phase 2. */
  priceType?: PriceType;
  /** Required when priceType is FIXED or HOURLY. Minor units (cents). */
  priceCents?: number;
  currency?: string;
  /** Optional, HOURLY only. */
  estimatedHours?: number;
}

export interface CreateJobPayload extends JobPricingInput {
  propertyId: string;
  type: JobType;
  title: string;
  description?: string;
  scheduledStart: string;
  scheduledEnd: string;
  assignedWorkerId?: string;
  priority?: JobPriority;
}

/**
 * Job edits. Pricing fields are allowed while the job is DRAFT or ASSIGNED;
 * the remaining (non-pricing) fields are only accepted while the job is DRAFT.
 */
export interface UpdateJobPayload extends JobPricingInput {
  propertyId?: string;
  type?: JobType;
  title?: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
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
  /** Worker's actual hours, accepted when finishing an HOURLY job. */
  spentHours?: number;
}
