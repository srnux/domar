import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/auth.service';
import { CreateJobDto } from './dto/create-job.dto';
import { TransitionJobDto } from './dto/transition-job.dto';
import {
  availableTransitions,
  canTransition,
} from './job-status.machine';

const jobInclude = {
  property: {
    select: {
      id: true,
      name: true,
      address: true,
      lat: true,
      lng: true,
      accessNotes: true,
    },
  },
  assignedWorker: { select: { id: true, name: true } },
  checklistItems: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      text: true,
      photoRequired: true,
      done: true,
      sortOrder: true,
    },
  },
  photos: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      kind: true,
      caption: true,
      checklistItemId: true,
      uploadedById: true,
      createdAt: true,
    },
  },
} satisfies Prisma.JobInclude;

type JobWithRelations = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(job: JobWithRelations, actor: AccessTokenPayload) {
    const { propertyId: _p, assignedWorkerId, createdById: _c, ...rest } = job;
    return {
      ...rest,
      allowedTransitions: availableTransitions(job.status, {
        role: actor.role,
        isAssignedWorker: assignedWorkerId === actor.sub,
      }),
    };
  }

  /** Visibility filter: workers see their jobs, owners their properties'. */
  private scopeFor(actor: AccessTokenPayload): Prisma.JobWhereInput {
    switch (actor.role) {
      case Role.SUPERVISOR:
        return {};
      case Role.WORKER:
        return { assignedWorkerId: actor.sub };
      case Role.OWNER:
        return { property: { ownerId: actor.sub } };
    }
  }

  async create(dto: CreateJobDto, actor: AccessTokenPayload) {
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (end <= start) {
      throw new BadRequestException('scheduledEnd must be after scheduledStart');
    }

    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property || !property.isActive) {
      throw new BadRequestException('Unknown or inactive property');
    }

    if (dto.assignedWorkerId) {
      await this.assertActiveWorker(dto.assignedWorkerId);
    }

    // Cleaning jobs snapshot the property's checklist template — a copy,
    // so later template edits never rewrite history.
    const templateItems =
      dto.type === 'CLEANING'
        ? await this.prisma.checklistTemplateItem.findMany({
            where: { template: { propertyId: dto.propertyId } },
            orderBy: { sortOrder: 'asc' },
          })
        : [];

    const job = await this.prisma.job.create({
      data: {
        propertyId: dto.propertyId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        scheduledStart: start,
        scheduledEnd: end,
        assignedWorkerId: dto.assignedWorkerId,
        status: dto.assignedWorkerId ? JobStatus.ASSIGNED : JobStatus.DRAFT,
        createdById: actor.sub,
        checklistItems: {
          create: templateItems.map((item, i) => ({
            text: item.text,
            photoRequired: item.photoRequired,
            sortOrder: i,
          })),
        },
      },
      include: jobInclude,
    });
    return this.toDto(job, actor);
  }

  async list(actor: AccessTokenPayload) {
    const jobs = await this.prisma.job.findMany({
      where: this.scopeFor(actor),
      include: jobInclude,
      orderBy: { scheduledStart: 'asc' },
    });
    return jobs.map((j) => this.toDto(j, actor));
  }

  async get(id: string, actor: AccessTokenPayload) {
    const job = await this.prisma.job.findFirst({
      where: { AND: [{ id }, this.scopeFor(actor)] },
      include: jobInclude,
    });
    if (!job) throw new NotFoundException();
    return this.toDto(job, actor);
  }

  async transition(id: string, dto: TransitionJobDto, actor: AccessTokenPayload) {
    const job = await this.prisma.job.findFirst({
      where: { AND: [{ id }, this.scopeFor(actor)] },
    });
    if (!job) throw new NotFoundException();

    const verdict = canTransition(job.status, dto.to, {
      role: actor.role,
      isAssignedWorker: job.assignedWorkerId === actor.sub,
      reason: dto.reason,
    });
    if (!verdict.ok) {
      throw new ConflictException(verdict.error);
    }

    if (dto.to === JobStatus.DONE) {
      await this.assertChecklistComplete(job.id);
    }

    const data: Prisma.JobUpdateInput = { status: dto.to };

    if (dto.to === JobStatus.ASSIGNED) {
      // entering ASSIGNED (assign, reassign, reopen): worker may change
      const workerId = dto.assignedWorkerId ?? job.assignedWorkerId;
      if (!workerId) {
        throw new BadRequestException('assignedWorkerId is required');
      }
      await this.assertActiveWorker(workerId);
      data.assignedWorker = { connect: { id: workerId } };
    }
    if (dto.reason !== undefined) {
      data.statusReason = dto.reason;
    }
    if (dto.to === JobStatus.DONE && dto.workerNotes !== undefined) {
      data.workerNotes = dto.workerNotes;
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data,
      include: jobInclude,
    });

    // A reopen (done → assigned) lands in the thread so the worker sees why.
    if (job.status === JobStatus.DONE && dto.to === JobStatus.ASSIGNED) {
      await this.prisma.jobComment.create({
        data: {
          jobId: id,
          authorId: actor.sub,
          body: `Reopened: ${dto.reason}`,
          visibility: 'INTERNAL',
        },
      });
    }

    return this.toDto(updated, actor);
  }

  /** Finishing requires every item checked and photo-required items shot. */
  private async assertChecklistComplete(jobId: string) {
    const items = await this.prisma.checklistItem.findMany({
      where: { jobId },
      include: { photos: { select: { id: true } } },
    });
    const unchecked = items.filter((i) => !i.done);
    if (unchecked.length > 0) {
      throw new ConflictException(
        `Checklist incomplete: ${unchecked.map((i) => i.text).join(', ')}`,
      );
    }
    const missingPhoto = items.filter(
      (i) => i.photoRequired && i.photos.length === 0,
    );
    if (missingPhoto.length > 0) {
      throw new ConflictException(
        `Photo required: ${missingPhoto.map((i) => i.text).join(', ')}`,
      );
    }
  }

  private async assertActiveWorker(workerId: string) {
    const worker = await this.prisma.user.findUnique({
      where: { id: workerId },
    });
    if (!worker || worker.role !== Role.WORKER || !worker.isActive) {
      throw new BadRequestException('assignedWorkerId is not an active worker');
    }
  }
}
