import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import type { AccessTokenPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';

const ratingSelect = {
  score: true,
  comment: true,
} satisfies Prisma.JobRatingSelect;

/** Statuses at which the work is finished and may be rated. */
const RATEABLE_STATUSES: JobStatus[] = [JobStatus.DONE, JobStatus.VERIFIED];

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** An owner may rate a finished job on a property they own. */
  async rate(jobId: string, dto: CreateRatingDto, actor: AccessTokenPayload) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, property: { ownerId: actor.sub } },
      select: { id: true, status: true, assignedWorkerId: true },
    });
    if (!job) throw new NotFoundException();

    if (!RATEABLE_STATUSES.includes(job.status)) {
      throw new BadRequestException('Only finished jobs can be rated');
    }
    if (!job.assignedWorkerId) {
      throw new BadRequestException('Job has no assigned worker to rate');
    }

    return this.prisma.jobRating.upsert({
      where: { jobId },
      create: {
        jobId,
        workerId: job.assignedWorkerId,
        ratedById: actor.sub,
        score: dto.score,
        comment: dto.comment,
      },
      update: {
        score: dto.score,
        comment: dto.comment,
      },
      select: ratingSelect,
    });
  }
}
