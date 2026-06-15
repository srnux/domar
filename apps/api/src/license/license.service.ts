import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Only staff consume license seats; owners are customers and are not counted. */
const SEAT_ROLES: Role[] = [Role.SUPERVISOR, Role.WORKER];

/** A Prisma client or an interactive-transaction client — both expose the model delegates we use. */
type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class LicenseService {
  constructor(private readonly prisma: PrismaService) {}

  isSeatRole(role: Role): boolean {
    return SEAT_ROLES.includes(role);
  }

  /**
   * Seats currently consumed by a company: active staff users + pending,
   * non-expired staff invites (so two invites can't both claim the last seat).
   */
  async seatsUsed(
    companyId: string,
    opts?: { client?: DbClient; excludeInviteId?: string },
  ): Promise<number> {
    const client = opts?.client ?? this.prisma;
    const now = new Date();
    const [users, invites] = await Promise.all([
      client.user.count({
        where: { companyId, isActive: true, role: { in: SEAT_ROLES } },
      }),
      client.invite.count({
        where: {
          companyId,
          role: { in: SEAT_ROLES },
          consumedAt: null,
          expiresAt: { gt: now },
          ...(opts?.excludeInviteId ? { id: { not: opts.excludeInviteId } } : {}),
        },
      }),
    ]);
    return users + invites;
  }

  /**
   * Throws if adding one more seat for `role` would exceed the company's cap.
   * No-op for non-seat roles (owners). Pass a tx client + excludeInviteId from
   * invite acceptance for the authoritative re-check.
   */
  async assertCanAddSeat(
    companyId: string,
    role: Role,
    opts?: { client?: DbClient; excludeInviteId?: string },
  ): Promise<void> {
    if (!this.isSeatRole(role)) return;
    const client = opts?.client ?? this.prisma;
    const company = await client.company.findUnique({
      where: { id: companyId },
      select: { maxSeats: true },
    });
    if (!company) throw new BadRequestException('Unknown company');
    const used = await this.seatsUsed(companyId, opts);
    if (used >= company.maxSeats) {
      throw new BadRequestException(
        'User license limit reached for this company',
      );
    }
  }
}
