import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateBillDto {
  @IsOptional()
  @IsString()
  currency?: string;

  /** VAT rate in basis points (1900 = 19%). null clears it. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  taxRateBps?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;
}
