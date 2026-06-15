import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AddLineItemDto {
  @IsString()
  @MinLength(1)
  label!: string;

  /** Net unit amount in minor units (cents). */
  @IsInt()
  @Min(0)
  unitAmountCents!: number;

  /** Quantity in hundredths (100 = 1.00). Defaults to 100. */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
