export const Role = {
  SUPERVISOR: 'SUPERVISOR',
  WORKER: 'WORKER',
  OWNER: 'OWNER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const JobType = {
  CLEANING: 'CLEANING',
  REPAIR: 'REPAIR',
  ELECTRICAL: 'ELECTRICAL',
  PLUMBING: 'PLUMBING',
  INSPECTION: 'INSPECTION',
  OTHER: 'OTHER',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
  DRAFT: 'DRAFT',
  /** Reserved for the future claim-pool — not used in v1 flows. */
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  VERIFIED: 'VERIFIED',
  CANCELLED: 'CANCELLED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const JobPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type JobPriority = (typeof JobPriority)[keyof typeof JobPriority];

export const PriceType = {
  FIXED: 'FIXED',
  HOURLY: 'HOURLY',
  /** Reserved for the Phase 2 bidding flow — rejected on create/update in Phase 1. */
  NEGOTIABLE: 'NEGOTIABLE',
} as const;
export type PriceType = (typeof PriceType)[keyof typeof PriceType];

export const BidStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
} as const;
export type BidStatus = (typeof BidStatus)[keyof typeof BidStatus];

export const PhotoKind = {
  BEFORE: 'BEFORE',
  AFTER: 'AFTER',
  ISSUE: 'ISSUE',
} as const;
export type PhotoKind = (typeof PhotoKind)[keyof typeof PhotoKind];

export const CommentVisibility = {
  INTERNAL: 'INTERNAL',
  SHARED: 'SHARED',
} as const;
export type CommentVisibility =
  (typeof CommentVisibility)[keyof typeof CommentVisibility];

export const Skill = {
  CLEANING: 'CLEANING',
  REPAIR: 'REPAIR',
  ELECTRICAL: 'ELECTRICAL',
  PLUMBING: 'PLUMBING',
  GENERAL: 'GENERAL',
} as const;
export type Skill = (typeof Skill)[keyof typeof Skill];

export const ActivityType = {
  CREATED: 'CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];
