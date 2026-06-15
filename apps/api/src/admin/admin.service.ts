import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { LicenseService } from '../license/license.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCompanyDto,
  ReassignOwnerDto,
  UpdateCompanyDto,
} from './dto/admin-company.dto';

/**
 * Platform-admin operations on tenants. Runs in admin context (the tenant
 * extension skips scoping), so every company is reachable and companyId is set
 * explicitly on writes.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly license: LicenseService,
  ) {}

  /** Creates a company together with its first supervisor (its account-owner). */
  async createCompany(dto: CreateCompanyDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.supervisor.email },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }
    if (dto.parentCompanyId) {
      await this.assertCompanyExists(dto.parentCompanyId);
    }

    const passwordHash = await argon2.hash(dto.supervisor.password);

    const company = await this.prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          name: dto.name,
          plan: dto.plan ?? null,
          maxSeats: dto.maxSeats,
          monthlyFeeCents: dto.monthlyFeeCents ?? 0,
          parentCompanyId: dto.parentCompanyId ?? null,
        },
      });
      const supervisor = await tx.user.create({
        data: {
          email: dto.supervisor.email,
          name: dto.supervisor.name,
          phone: dto.supervisor.phone,
          role: Role.SUPERVISOR,
          companyId: created.id,
          passwordHash,
        },
      });
      return tx.company.update({
        where: { id: created.id },
        data: { ownerUserId: supervisor.id },
      });
    });

    return this.toDetail(company.id);
  }

  async listCompanies() {
    const companies = await this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return Promise.all(
      companies.map(async (c) => ({
        ...c,
        seatsUsed: await this.license.seatsUsed(c.id),
      })),
    );
  }

  async getCompany(id: string) {
    return this.toDetail(id);
  }

  async updateCompany(id: string, dto: UpdateCompanyDto) {
    await this.assertCompanyExists(id);
    if (dto.parentCompanyId) {
      if (dto.parentCompanyId === id) {
        throw new BadRequestException('A company cannot be its own parent');
      }
      await this.assertCompanyExists(dto.parentCompanyId);
    }
    await this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name,
        plan: dto.plan,
        maxSeats: dto.maxSeats,
        monthlyFeeCents: dto.monthlyFeeCents,
        parentCompanyId: dto.parentCompanyId,
      },
    });
    return this.toDetail(id);
  }

  /** Suspend a tenant: block new sessions and revoke existing refresh tokens. */
  async suspend(id: string) {
    await this.assertCompanyExists(id);
    await this.prisma.$transaction([
      this.prisma.company.update({
        where: { id },
        data: { status: CompanyStatus.SUSPENDED },
      }),
      // Caps the suspension staleness window at one access-token TTL — no
      // session can be renewed past its current access token.
      this.prisma.refreshToken.deleteMany({ where: { companyId: id } }),
    ]);
    return this.toDetail(id);
  }

  async activate(id: string) {
    await this.assertCompanyExists(id);
    await this.prisma.company.update({
      where: { id },
      data: { status: CompanyStatus.ACTIVE },
    });
    return this.toDetail(id);
  }

  /** Transfer the account-owner role to another supervisor in the same company. */
  async reassignOwner(id: string, dto: ReassignOwnerDto) {
    await this.assertCompanyExists(id);
    const user = await this.prisma.user.findUnique({
      where: { id: dto.ownerUserId },
    });
    if (!user || user.companyId !== id || user.role !== Role.SUPERVISOR) {
      throw new BadRequestException(
        'New owner must be a supervisor in this company',
      );
    }
    await this.prisma.company.update({
      where: { id },
      data: { ownerUserId: dto.ownerUserId },
    });
    return this.toDetail(id);
  }

  private async assertCompanyExists(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  private async toDetail(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!company) throw new NotFoundException('Company not found');
    return { ...company, seatsUsed: await this.license.seatsUsed(id) };
  }
}
