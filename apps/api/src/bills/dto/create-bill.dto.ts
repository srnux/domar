import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateBillDto {
  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  /** VAT rate in basis points (1900 = 19%). 0–10000. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  taxRateBps?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
