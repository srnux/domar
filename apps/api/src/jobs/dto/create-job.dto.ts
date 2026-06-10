import { JobPriority, JobType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateJobDto {
  @IsUUID()
  propertyId!: string;

  @IsEnum(JobType)
  type!: JobType;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  scheduledStart!: string;

  @IsISO8601()
  scheduledEnd!: string;

  @IsOptional()
  @IsUUID()
  assignedWorkerId?: string;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;
}
