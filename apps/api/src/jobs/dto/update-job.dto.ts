import { JobPriority, JobType, PriceType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Pricing fields shared by {@link CreateJobDto} and {@link UpdateJobDto}.
 * Kept separate so create's required fields aren't polluted by the optional
 * edit fields via class-validator's metadata inheritance.
 */
export class JobPricingDto {
  @IsOptional()
  @IsEnum(PriceType)
  priceType?: PriceType;

  /** Total (FIXED) or per-hour rate (HOURLY), in minor units (cents). */
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  /** Optional supervisor estimate, HOURLY only. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;
}

/**
 * Job edits. Pricing fields are allowed while the job is DRAFT or ASSIGNED;
 * the non-pricing fields below are only accepted while the job is DRAFT
 * (both enforced in the service).
 */
export class UpdateJobDto extends JobPricingDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsISO8601()
  scheduledStart?: string;

  @IsOptional()
  @IsISO8601()
  scheduledEnd?: string;

  @IsOptional()
  @IsUUID()
  assignedWorkerId?: string;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;
}
