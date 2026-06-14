import { JobStatus } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class TransitionJobDto {
  @IsEnum(JobStatus)
  to!: JobStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsUUID()
  assignedWorkerId?: string;

  @IsOptional()
  @IsString()
  workerNotes?: string;

  /** Worker's actual hours, accepted when finishing an HOURLY job. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  spentHours?: number;
}
