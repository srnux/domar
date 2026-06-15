import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillLineItemKind,
  BillStatus,
  JobStatus,
  PriceType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/auth.service';
import { billInclude, toBillDto } from './bill.mapper';
import { AddJobLinesDto } from './dto/add-job-lines.dto';
import { AddLineItemDto } from './dto/add-line-item.dto';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';

/** A billable job line, derived from a priced VERIFIED job. */
type JobLineData = {
  kind: typeof BillLineItemKind.JOB;
  jobId: string;
  label: string;
  quantity: number;
  unitAmountCents: number;
};

type PricedJob = {
  id: string;
  title: string;
  priceType: PriceType | null;
  priceCents: number | null;
  currency: string;
  spentHours: number | null;
};

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Owners see only their properties' confirmed bills; workers see none. */
  private scopeFor(actor: AccessTokenPayload): Prisma.BillWhereInput {
    switch (actor.role) {
      case Role.SUPERVISOR:
        return {};
      case Role.OWNER:
        return {
          property: { ownerId: actor.sub },
          status: BillStatus.CONFIRMED,
        };
      case Role.WORKER:
        return { id: { in: [] } };
    }
  }

  async list(actor: AccessTokenPayload) {
    const bills = await this.prisma.bill.findMany({
      where: this.scopeFor(actor),
      include: billInclude,
      orderBy: { createdAt: 'desc' },
    });
    return bills.map(toBillDto);
  }

  async get(id: string, actor: AccessTokenPayload) {
    const bill = await this.prisma.bill.findFirst({
      where: { AND: [{ id }, this.scopeFor(actor)] },
      include: billInclude,
    });
    if (!bill) throw new NotFoundException();
    return toBillDto(bill);
  }

  async create(dto: CreateBillDto, actor: AccessTokenPayload) {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property) throw new BadRequestException('Unknown property');

    const currency = dto.currency ?? 'EUR';
    const eligible = await this.eligibleJobsFor(dto.propertyId, currency);

    const bill = await this.prisma.bill.create({
      data: {
        propertyId: dto.propertyId,
        currency,
        taxRateBps: dto.taxRateBps ?? null,
        notes: dto.notes ?? null,
        createdById: actor.sub,
        lineItems: {
          create: eligible.map((job, i) => ({
            ...this.jobToLine(job),
            sortOrder: i,
          })),
        },
      },
      include: billInclude,
    });
    return toBillDto(bill);
  }

  async update(id: string, dto: UpdateBillDto) {
    await this.assertDraft(id);
    const data: Prisma.BillUpdateInput = {};
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.taxRateBps !== undefined) data.taxRateBps = dto.taxRateBps;
    if (dto.notes !== undefined) data.notes = dto.notes;
    const bill = await this.prisma.bill.update({
      where: { id },
      data,
      include: billInclude,
    });
    return toBillDto(bill);
  }

  async addJobLines(id: string, dto: AddJobLinesDto) {
    const bill = await this.assertDraft(id);

    const jobs = await this.prisma.job.findMany({
      where: { id: { in: dto.jobIds } },
      select: {
        id: true,
        title: true,
        status: true,
        propertyId: true,
        priceType: true,
        priceCents: true,
        currency: true,
        spentHours: true,
      },
    });

    const found = new Map(jobs.map((j) => [j.id, j]));
    const alreadyBilled = await this.billedJobIds(dto.jobIds);
    const existingOnBill = new Set(
      bill.lineItems.filter((li) => li.jobId).map((li) => li.jobId as string),
    );

    for (const jobId of dto.jobIds) {
      const job = found.get(jobId);
      if (!job) throw new BadRequestException(`Unknown job ${jobId}`);
      if (job.propertyId !== bill.propertyId) {
        throw new BadRequestException(
          'A job must belong to the same property as the bill',
        );
      }
      if (existingOnBill.has(jobId)) {
        throw new BadRequestException('Job is already on this bill');
      }
      if (alreadyBilled.has(jobId)) {
        throw new BadRequestException('Job is already on a confirmed bill');
      }
      this.assertBillable(job, bill.currency);
    }

    const start = bill.lineItems.length;
    await this.prisma.billLineItem.createMany({
      data: jobs.map((job, i) => ({
        billId: id,
        ...this.jobToLine(job),
        sortOrder: start + i,
      })),
    });

    return this.reload(id);
  }

  async addLineItem(id: string, dto: AddLineItemDto) {
    const bill = await this.assertDraft(id);
    await this.prisma.billLineItem.create({
      data: {
        billId: id,
        kind: BillLineItemKind.ADDITIONAL,
        label: dto.label,
        unitAmountCents: dto.unitAmountCents,
        quantity: dto.quantity ?? 100,
        sortOrder: bill.lineItems.length,
      },
    });
    return this.reload(id);
  }

  async updateLineItem(id: string, lineId: string, dto: UpdateLineItemDto) {
    await this.assertDraft(id);
    const line = await this.prisma.billLineItem.findFirst({
      where: { id: lineId, billId: id },
    });
    if (!line) throw new NotFoundException();
    if (line.kind === BillLineItemKind.JOB) {
      throw new BadRequestException(
        'Job-derived lines cannot be edited; remove and re-add the job instead',
      );
    }
    await this.prisma.billLineItem.update({
      where: { id: lineId },
      data: {
        label: dto.label,
        unitAmountCents: dto.unitAmountCents,
        quantity: dto.quantity,
      },
    });
    return this.reload(id);
  }

  async removeLineItem(id: string, lineId: string) {
    await this.assertDraft(id);
    const line = await this.prisma.billLineItem.findFirst({
      where: { id: lineId, billId: id },
    });
    if (!line) throw new NotFoundException();
    await this.prisma.billLineItem.delete({ where: { id: lineId } });
    return this.reload(id);
  }

  async confirm(id: string) {
    const bill = await this.assertDraft(id);
    if (bill.lineItems.length === 0) {
      throw new BadRequestException('Cannot confirm a bill with no line items');
    }

    const confirmed = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const countThisYear = await tx.bill.count({
        where: {
          status: BillStatus.CONFIRMED,
          confirmedAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
          },
        },
      });
      const number = `INV-${year}-${String(countThisYear + 1).padStart(4, '0')}`;
      return tx.bill.update({
        where: { id },
        data: { status: BillStatus.CONFIRMED, confirmedAt: now, number },
        include: billInclude,
      });
    });
    return toBillDto(confirmed);
  }

  async remove(id: string) {
    await this.assertDraft(id);
    await this.prisma.bill.delete({ where: { id } });
  }

  /** Eligible jobs the supervisor may bill against a property/currency. */
  async eligibleJobs(propertyId: string, currency: string) {
    return this.eligibleJobsFor(propertyId, currency);
  }

  // --- helpers -------------------------------------------------------------

  private async reload(id: string) {
    const bill = await this.prisma.bill.findUniqueOrThrow({
      where: { id },
      include: billInclude,
    });
    return toBillDto(bill);
  }

  private async assertDraft(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: billInclude,
    });
    if (!bill) throw new NotFoundException();
    if (bill.status !== BillStatus.DRAFT) {
      throw new ForbiddenException('Confirmed bills cannot be modified');
    }
    return bill;
  }

  /** VERIFIED, priced jobs for a property in the bill's currency, not yet billed. */
  private async eligibleJobsFor(
    propertyId: string,
    currency: string,
  ): Promise<PricedJob[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        propertyId,
        currency,
        status: JobStatus.VERIFIED,
        priceType: { in: [PriceType.FIXED, PriceType.HOURLY] },
        priceCents: { not: null },
      },
      select: {
        id: true,
        title: true,
        priceType: true,
        priceCents: true,
        currency: true,
        spentHours: true,
      },
      orderBy: { scheduledStart: 'asc' },
    });

    const billedIds = await this.billedJobIds(jobs.map((j) => j.id));
    return jobs.filter(
      (j) => !billedIds.has(j.id) && this.isBillable(j),
    );
  }

  /** Job ids that already appear on a CONFIRMED bill. */
  private async billedJobIds(jobIds: string[]): Promise<Set<string>> {
    if (jobIds.length === 0) return new Set();
    const lines = await this.prisma.billLineItem.findMany({
      where: {
        jobId: { in: jobIds },
        bill: { status: BillStatus.CONFIRMED },
      },
      select: { jobId: true },
    });
    return new Set(lines.map((l) => l.jobId as string));
  }

  private isBillable(job: PricedJob): boolean {
    if (job.priceCents == null) return false;
    if (job.priceType === PriceType.HOURLY) return job.spentHours != null;
    return job.priceType === PriceType.FIXED;
  }

  private assertBillable(job: PricedJob, billCurrency: string) {
    if (job.currency !== billCurrency) {
      throw new BadRequestException(
        `Job currency ${job.currency} does not match bill currency ${billCurrency}`,
      );
    }
    if (!this.isBillable(job)) {
      throw new BadRequestException(
        'Job is not billable: it must be a priced FIXED job, or an HOURLY job with logged hours',
      );
    }
  }

  private jobToLine(job: PricedJob): JobLineData {
    const unitAmountCents = job.priceCents ?? 0;
    const quantity =
      job.priceType === PriceType.HOURLY
        ? Math.round((job.spentHours ?? 0) * 100)
        : 100;
    return {
      kind: BillLineItemKind.JOB,
      jobId: job.id,
      label: job.title,
      quantity,
      unitAmountCents,
    };
  }
}
