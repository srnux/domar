import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { normalizeEmail } from '../../auth/email.util';

/** The initial supervisor created together with a new company. */
export class InitialSupervisorDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsInt()
  @Min(1)
  maxSeats!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyFeeCents?: number;

  @IsOptional()
  @IsUUID()
  parentCompanyId?: string;

  @ValidateNested()
  @Type(() => InitialSupervisorDto)
  supervisor!: InitialSupervisorDto;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxSeats?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyFeeCents?: number;

  @IsOptional()
  @IsUUID()
  parentCompanyId?: string | null;
}

export class ReassignOwnerDto {
  @IsUUID()
  ownerUserId!: string;
}
