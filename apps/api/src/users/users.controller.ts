import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

class ListUsersQuery {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.prisma.user.findMany({
      where: { isActive: true, ...(query.role ? { role: query.role } : {}) },
      orderBy: { name: 'asc' },
      omit: { passwordHash: true },
    });
  }
}
