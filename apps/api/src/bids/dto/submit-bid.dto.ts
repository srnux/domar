import { PriceType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** A worker's proposed price for a negotiable job. */
export class SubmitBidDto {
  @IsEnum(PriceType)
  priceType!: PriceType;

  /** Total (FIXED) or per-hour rate (HOURLY), in the job's currency (minor units). */
  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsOptional()
  @IsString()
  message?: string;
}
