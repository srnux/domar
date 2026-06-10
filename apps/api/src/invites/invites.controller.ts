import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, Skill } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

const INVITE_TTL_MS = 7 * 24 * 3600_000;

class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsArray()
  @IsEnum(Skill, { each: true })
  skills?: Skill[];
}

class AcceptInviteDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Controller('invites')
export class InvitesController {
  private readonly logger = new Logger('Invites');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  async create(@Body() dto: CreateInviteDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    // a fresh invite supersedes older ones for the same address
    await this.prisma.invite.deleteMany({ where: { email: dto.email } });

    const token = randomBytes(32).toString('base64url');
    await this.prisma.invite.create({
      data: {
        email: dto.email,
        role: dto.role,
        skills: dto.skills ?? [],
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    const baseUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3002';
    const inviteUrl = `${baseUrl}/invite/${token}`;
    // v1 has no SMTP — the supervisor copies the link; dev log for convenience
    this.logger.log(`Invite for ${dto.email}: ${inviteUrl}`);
    return { inviteUrl, token };
  }

  private async findValid(token: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash: hash(token) },
    });
    if (!invite || invite.consumedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite is invalid or expired');
    }
    return invite;
  }

  @Get(':token')
  async inspect(@Param('token') token: string) {
    const invite = await this.findValid(token);
    return { email: invite.email, role: invite.role };
  }

  @Post(':token/accept')
  async accept(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    const invite = await this.findValid(token);

    const passwordHash = await argon2.hash(dto.password);
    await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          email: invite.email,
          name: dto.name,
          phone: dto.phone,
          role: invite.role,
          skills: invite.skills,
          passwordHash,
        },
      }),
      this.prisma.invite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }
}
