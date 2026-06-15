import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role, Skill } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LicenseService } from '../license/license.service';
import { PrismaService } from '../prisma/prisma.service';

class ListUsersQuery {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  includeInactive?: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Skill, { each: true })
  skills?: Skill[];
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly license: LicenseService,
  ) {}

  @Get()
  async list(@Query() query: ListUsersQuery) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(query.includeInactive === 'true' ? {} : { isActive: true }),
        ...(query.role ? { role: query.role } : {}),
      },
      orderBy: { name: 'asc' },
      omit: { passwordHash: true },
    });

    // Per-worker rating aggregate, surfaced on the supervisor workers page.
    const aggregates = await this.prisma.jobRating.groupBy({
      by: ['workerId'],
      _avg: { score: true },
      _count: { _all: true },
    });
    const byWorker = new Map(aggregates.map((a) => [a.workerId, a]));

    return users.map((user) => {
      const agg = byWorker.get(user.id);
      return {
        ...user,
        avgScore:
          agg?._avg.score != null
            ? Math.round(agg._avg.score * 10) / 10
            : null,
        ratingCount: agg?._count._all ?? 0,
      };
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (id === req.user.sub && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate yourself');
    }
    // findFirst so the extension scopes by companyId before update-by-id.
    const user = await this.prisma.user.findFirst({ where: { id } });
    if (!user) throw new NotFoundException();
    // Reactivating a staff member consumes a seat — enforce the cap.
    if (dto.isActive === true && !user.isActive && user.companyId) {
      await this.license.assertCanAddSeat(user.companyId, user.role);
    }
    return this.prisma.user.update({
      where: { id },
      data: dto,
      omit: { passwordHash: true },
    });
  }
}
