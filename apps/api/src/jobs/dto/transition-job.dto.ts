import { JobStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

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
}
