import type { BidStatus, PriceType } from '../enums';
import type { JobDto } from './job';

export interface BidWorkerDto {
  id: string;
  name: string;
}

export interface BidDto {
  id: string;
  jobId: string;
  worker: BidWorkerDto;
  /** FIXED or HOURLY — the worker's proposal. */
  priceType: PriceType;
  /** Total (FIXED) or per-hour rate (HOURLY), in the job's currency (minor units). */
  amountCents: number;
  message: string | null;
  status: BidStatus;
  createdAt: string;
}

export interface SubmitBidPayload {
  priceType: PriceType;
  amountCents: number;
  message?: string;
}

/** An open negotiable job in the bidding pool, with the caller's own bid (if any). */
export type BiddableJobDto = JobDto & { myBid: BidDto | null };
