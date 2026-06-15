import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateLineItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitAmountCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
