import { PriceType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Pricing edits. Allowed while the job is DRAFT or ASSIGNED (enforced in the service).
 * Also the base for {@link CreateJobDto} so create and update share the pricing fields.
 */
export class UpdateJobDto {
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
