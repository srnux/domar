import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  BidStatus,
  JobStatus,
  PriceType,
  Role,
} from '@prisma/client';
import type { AccessTokenPayload } from '../auth/auth.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { SubmitBidDto } from './dto/submit-bid.dto';
import { bidInclude, toBidDto } from './bid.mapper';

@Injectable()
export class BidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly jobs: JobsService,
  ) {}

  /** List bids: supervisor sees all (cheapest first); a worker sees only their own. */
  async list(jobId: string, actor: AccessTokenPayload) {
    // findFirst (not findUnique) so the tenant extension scopes by companyId.
    const job = await this.prisma.job.findFirst({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) throw new NotFoundException();

    if (actor.role === Role.WORKER) {
      const bids = await this.prisma.bid.findMany({
        where: { jobId, workerId: actor.sub },
        include: bidInclude,
      });
      return bids.map(toBidDto);
    }
    if (actor.role === Role.SUPERVISOR) {
      const bids = await this.prisma.bid.findMany({
        where: { jobId },
        orderBy: { amountCents: 'asc' },
        include: bidInclude,
      });
      return bids.map(toBidDto);
    }
    throw new NotFoundException(); // owners don't see bids
  }

  /** Worker submits or revises their bid on an open negotiable job. */
  async submit(jobId: string, dto: SubmitBidDto, actor: AccessTokenPayload) {
    if (dto.priceType === PriceType.NEGOTIABLE) {
      throw new BadRequestException('A bid must be FIXED or HOURLY');
    }
    const job = await this.assertOpenForBids(jobId);

    const bid = await this.prisma.bid.upsert({
      where: { jobId_workerId: { jobId, workerId: actor.sub } },
      create: {
        jobId,
        workerId: actor.sub,
        companyId: job.companyId,
        priceType: dto.priceType,
        amountCents: dto.amountCents,
        message: dto.message,
      },
      update: {
        priceType: dto.priceType,
        amountCents: dto.amountCents,
        message: dto.message,
        status: BidStatus.PENDING,
      },
      include: bidInclude,
    });
    return toBidDto(bid);
  }

  /** Worker withdraws their own bid (hard delete so they can re-bid cleanly). */
  async withdraw(jobId: string, bidId: string, actor: AccessTokenPayload) {
    // findFirst so the extension scopes by companyId before we delete by id.
    const bid = await this.prisma.bid.findFirst({ where: { id: bidId } });
    if (!bid || bid.jobId !== jobId) throw new NotFoundException();
    if (bid.workerId !== actor.sub) {
      throw new ForbiddenException('You can only withdraw your own bid');
    }
    await this.prisma.bid.delete({ where: { id: bidId } });
    return { ok: true as const };
  }

  /**
   * Supervisor accepts a bid: its price is copied onto the job, the job is
   * assigned to that worker (OPEN → ASSIGNED), and the other bids are rejected.
   */
  async accept(jobId: string, bidId: string, actor: AccessTokenPayload) {
    // findFirst so the extension scopes both lookups by companyId.
    const job = await this.prisma.job.findFirst({ where: { id: jobId } });
    if (!job) throw new NotFoundException();
    if (job.status !== JobStatus.OPEN || job.priceType !== PriceType.NEGOTIABLE) {
      throw new BadRequestException('Job is not open for bids');
    }
    const bid = await this.prisma.bid.findFirst({ where: { id: bidId } });
    if (!bid || bid.jobId !== jobId) throw new NotFoundException();

    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.ASSIGNED,
          assignedWorkerId: bid.workerId,
          priceType: bid.priceType,
          priceCents: bid.amountCents,
        },
      }),
      this.prisma.bid.update({
        where: { id: bidId },
        data: { status: BidStatus.ACCEPTED },
      }),
      this.prisma.bid.updateMany({
        where: { jobId, id: { not: bidId } },
        data: { status: BidStatus.REJECTED },
      }),
    ]);

    await this.activity.record({
      jobId,
      actorId: actor.sub,
      type: ActivityType.STATUS_CHANGED,
      fromStatus: JobStatus.OPEN,
      toStatus: JobStatus.ASSIGNED,
    });

    return this.jobs.get(jobId, actor);
  }

  private async assertOpenForBids(jobId: string) {
    // findFirst so the extension scopes by companyId; returns the job's tenant
    // so the bid can be stamped with the correct companyId.
    const job = await this.prisma.job.findFirst({
      where: { id: jobId },
      select: { companyId: true, status: true, priceType: true },
    });
    if (!job) throw new NotFoundException();
    if (job.status !== JobStatus.OPEN || job.priceType !== PriceType.NEGOTIABLE) {
      throw new BadRequestException('Job is not open for bids');
    }
    return job;
  }
}
