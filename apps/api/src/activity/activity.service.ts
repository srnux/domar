import { Injectable } from '@nestjs/common';
import { ActivityType, JobStatus, Prisma, Role } from '@prisma/client';
import type { ActivityEventDto } from '@domar/shared';
import type { AccessTokenPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

const activityInclude = {
  actor: { select: { id: true, name: true, role: true } },
  job: {
    select: {
      id: true,
      title: true,
      type: true,
      property: { select: { id: true, name: true } },
      assignedWorker: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ActivityEventInclude;

type ActivityWithRelations = Prisma.ActivityEventGetPayload<{
  include: typeof activityInclude;
}>;

interface RecordArgs {
  jobId: string;
  actorId: string | null;
  type: ActivityType;
  fromStatus?: JobStatus | null;
  toStatus?: JobStatus | null;
  reason?: string | null;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Append a single audit event. Called by JobsService on create/transition. */
  async record(args: RecordArgs): Promise<void> {
    await this.prisma.activityEvent.create({
      data: {
        jobId: args.jobId,
        actorId: args.actorId,
        type: args.type,
        fromStatus: args.fromStatus ?? null,
        toStatus: args.toStatus ?? null,
        reason: args.reason ?? null,
      },
    });
  }

  async list(
    actor: AccessTokenPayload,
    limit = 30,
  ): Promise<ActivityEventDto[]> {
    const events = await this.prisma.activityEvent.findMany({
      where: this.scopeFor(actor),
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: activityInclude,
    });
    return events.map(toDto);
  }

  /** Mirrors JobsService.scopeFor, applied through the job relation. */
  private scopeFor(actor: AccessTokenPayload): Prisma.ActivityEventWhereInput {
    switch (actor.role) {
      case Role.SUPERVISOR:
        return {};
      case Role.WORKER:
        return { job: { assignedWorkerId: actor.sub } };
      case Role.OWNER:
        return { job: { property: { ownerId: actor.sub } } };
    }
  }
}

function toDto(event: ActivityWithRelations): ActivityEventDto {
  return {
    id: event.id,
    type: event.type,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    reason: event.reason,
    createdAt: event.createdAt.toISOString(),
    actor: event.actor,
    job: event.job,
  };
}
