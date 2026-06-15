import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent: re-registering the same token re-points it at this user. */
  async register(
    userId: string,
    companyId: string | null,
    dto: RegisterDeviceDto,
  ) {
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: {
        token: dto.token,
        platform: dto.platform,
        userId,
        companyId,
      },
      update: {
        userId,
        companyId,
        platform: dto.platform,
        lastSeenAt: new Date(),
      },
    });
    return { ok: true as const };
  }

  async unregister(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
    return { ok: true as const };
  }
}
