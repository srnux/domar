import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, JobStatus, PriceType, Prisma, Role } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/auth.service';
import { CreateJobDto } from './dto/create-job.dto';
import { TransitionJobDto } from './dto/transition-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { availableTransitions, canTransition } from './job-status.machine';
import { toBidDto } from '../bids/bid.mapper';

/** Pricing edits are only allowed before work starts. */
const PRICE_EDITABLE_STATUSES: JobStatus[] = [
  JobStatus.DRAFT,
  JobStatus.ASSIGNED,
];

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
  rating: { select: { score: true, comment: true } },
  _count: { select: { bids: true } },
} satisfies Prisma.JobInclude;

type JobWithRelations = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  private toDto(job: JobWithRelations, actor: AccessTokenPayload) {
    const {
      propertyId: _p,
      assignedWorkerId,
      createdById: _c,
      _count,
      ...rest
    } = job;
    return {
      ...rest,
      bidCount: _count.bids,
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
      throw new BadRequestException(
        'scheduledEnd must be after scheduledStart',
      );
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

    this.validatePricing(dto);

    // A negotiable job opens for bids immediately; otherwise the usual
    // draft/assigned split applies.
    const status =
      dto.priceType === PriceType.NEGOTIABLE
        ? JobStatus.OPEN
        : dto.assignedWorkerId
          ? JobStatus.ASSIGNED
          : JobStatus.DRAFT;

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
        status,
        createdById: actor.sub,
        priceType: dto.priceType,
        priceCents: dto.priceCents,
        currency: dto.currency,
        estimatedHours: dto.estimatedHours,
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

    await this.activity.record({
      jobId: job.id,
      actorId: actor.sub,
      type: ActivityType.CREATED,
      toStatus: job.status,
    });

    return this.toDto(job, actor);
  }

  /**
   * Supervisor edits. Pricing may change while the job is DRAFT or ASSIGNED;
   * the remaining fields may change only while it's still a DRAFT (no work yet).
   */
  async update(id: string, dto: UpdateJobDto, actor: AccessTokenPayload) {
    const job = await this.prisma.job.findFirst({
      where: { AND: [{ id }, this.scopeFor(actor)] },
      include: jobInclude,
    });
    if (!job) throw new NotFoundException();

    const editsContent =
      dto.propertyId !== undefined ||
      dto.type !== undefined ||
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.scheduledStart !== undefined ||
      dto.scheduledEnd !== undefined ||
      dto.assignedWorkerId !== undefined ||
      dto.priority !== undefined;

    if (editsContent) {
      if (job.status !== JobStatus.DRAFT) {
        throw new BadRequestException('Only draft jobs can be edited');
      }
    } else if (!PRICE_EDITABLE_STATUSES.includes(job.status)) {
      throw new BadRequestException(
        'Price can only be changed while the job is DRAFT or ASSIGNED',
      );
    }

    const data: Prisma.JobUpdateInput = {};

    if (editsContent) {
      const start = new Date(dto.scheduledStart ?? job.scheduledStart);
      const end = new Date(dto.scheduledEnd ?? job.scheduledEnd);
      if (end <= start) {
        throw new BadRequestException(
          'scheduledEnd must be after scheduledStart',
        );
      }

      const propertyId = dto.propertyId ?? job.propertyId;
      if (dto.propertyId !== undefined && dto.propertyId !== job.propertyId) {
        const property = await this.prisma.property.findUnique({
          where: { id: dto.propertyId },
        });
        if (!property || !property.isActive) {
          throw new BadRequestException('Unknown or inactive property');
        }
      }

      if (dto.assignedWorkerId) {
        await this.assertActiveWorker(dto.assignedWorkerId);
      }

      if (dto.propertyId !== undefined) {
        data.property = { connect: { id: dto.propertyId } };
      }
      if (dto.type !== undefined) data.type = dto.type;
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.scheduledStart !== undefined) data.scheduledStart = start;
      if (dto.scheduledEnd !== undefined) data.scheduledEnd = end;
      if (dto.priority !== undefined) data.priority = dto.priority;

      // The draft hasn't been worked yet, so a type/property change can safely
      // re-snapshot the cleaning checklist (or clear it when no longer CLEANING).
      const effType = dto.type ?? job.type;
      const typeOrPropChanged =
        (dto.type !== undefined && dto.type !== job.type) ||
        (dto.propertyId !== undefined && dto.propertyId !== job.propertyId);
      if (typeOrPropChanged) {
        const templateItems =
          effType === 'CLEANING'
            ? await this.prisma.checklistTemplateItem.findMany({
                where: { template: { propertyId } },
                orderBy: { sortOrder: 'asc' },
              })
            : [];
        data.checklistItems = {
          deleteMany: {},
          create: templateItems.map((item, i) => ({
            text: item.text,
            photoRequired: item.photoRequired,
            sortOrder: i,
          })),
        };
      }
    }

    // Validate the merged result so a partial edit can't leave an invalid price.
    this.validatePricing({
      priceType: dto.priceType ?? job.priceType ?? undefined,
      priceCents: dto.priceCents ?? job.priceCents ?? undefined,
      assignedWorkerId: dto.assignedWorkerId ?? job.assignedWorkerId ?? undefined,
    });
    if (dto.priceType !== undefined) data.priceType = dto.priceType;
    if (dto.priceCents !== undefined) data.priceCents = dto.priceCents;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.estimatedHours !== undefined) data.estimatedHours = dto.estimatedHours;

    // Re-derive status the way create does. update() only runs on DRAFT/ASSIGNED
    // jobs and both derive correctly: a negotiable job opens for bids, an assigned
    // one stays ASSIGNED, otherwise it's a draft.
    const effPriceType = dto.priceType ?? job.priceType;
    const effWorkerId = dto.assignedWorkerId ?? job.assignedWorkerId;
    if (effPriceType === PriceType.NEGOTIABLE) {
      data.status = JobStatus.OPEN;
    } else if (effWorkerId) {
      data.status = JobStatus.ASSIGNED;
    } else {
      data.status = JobStatus.DRAFT;
    }
    if (dto.assignedWorkerId && effPriceType !== PriceType.NEGOTIABLE) {
      data.assignedWorker = { connect: { id: dto.assignedWorkerId } };
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data,
      include: jobInclude,
    });

    return this.toDto(updated, actor);
  }

  async list(actor: AccessTokenPayload) {
    const jobs = await this.prisma.job.findMany({
      where: this.scopeFor(actor),
      include: jobInclude,
      orderBy: { scheduledStart: 'asc' },
    });
    return jobs.map((j) => this.toDto(j, actor));
  }

  /** The bidding pool: open negotiable jobs, each with the caller's own bid. */
  async listOpenForBids(actor: AccessTokenPayload) {
    const jobs = await this.prisma.job.findMany({
      where: { status: JobStatus.OPEN, priceType: PriceType.NEGOTIABLE },
      include: {
        ...jobInclude,
        bids: {
          where: { workerId: actor.sub },
          include: { worker: { select: { id: true, name: true } } },
        },
      },
      orderBy: { scheduledStart: 'asc' },
    });
    return jobs.map(({ bids, ...job }) => ({
      ...this.toDto(job, actor),
      myBid: bids[0] ? toBidDto(bids[0]) : null,
    }));
  }

  async get(id: string, actor: AccessTokenPayload) {
    const job = await this.prisma.job.findFirst({
      where: { AND: [{ id }, this.scopeFor(actor)] },
      include: jobInclude,
    });
    if (!job) throw new NotFoundException();
    return this.toDto(job, actor);
  }

  async transition(
    id: string,
    dto: TransitionJobDto,
    actor: AccessTokenPayload,
  ) {
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
    // Worker logs their actual hours when finishing an hourly job.
    if (
      dto.to === JobStatus.DONE &&
      job.priceType === PriceType.HOURLY &&
      dto.spentHours !== undefined
    ) {
      data.spentHours = dto.spentHours;
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data,
      include: jobInclude,
    });

    await this.activity.record({
      jobId: id,
      actorId: actor.sub,
      type: ActivityType.STATUS_CHANGED,
      fromStatus: job.status,
      toStatus: dto.to,
      reason: dto.reason,
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

  /**
   * A FIXED/HOURLY job must carry an amount. A NEGOTIABLE job carries no price
   * (it's set by accepting a bid) and cannot be pre-assigned to a worker.
   */
  private validatePricing(pricing: {
    priceType?: PriceType | null;
    priceCents?: number | null;
    assignedWorkerId?: string | null;
  }) {
    if (!pricing.priceType) return;
    if (pricing.priceType === PriceType.NEGOTIABLE) {
      if (pricing.priceCents != null) {
        throw new BadRequestException(
          'A negotiable job must not carry a fixed price',
        );
      }
      if (pricing.assignedWorkerId) {
        throw new BadRequestException(
          'A negotiable job cannot be pre-assigned; it is assigned by accepting a bid',
        );
      }
      return;
    }
    if (pricing.priceCents == null) {
      throw new BadRequestException(
        'priceCents is required for FIXED and HOURLY pricing',
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
