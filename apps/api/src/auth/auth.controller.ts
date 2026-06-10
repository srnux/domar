import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from './auth.cookies';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from './jwt-auth.guard';

type SafeUser = Omit<User, 'passwordHash'>;

function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function refreshCookieOf(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[
    REFRESH_COOKIE
  ];
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SafeUser> {
    const tokens = await this.auth.login(dto.email, dto.password);
    setAuthCookies(res, tokens);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { email: dto.email },
    });
    return toSafeUser(user);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const refreshToken = refreshCookieOf(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokens = await this.auth.refresh(refreshToken);
    setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const refreshToken = refreshCookieOf(req);
    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }
    clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthenticatedRequest): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return toSafeUser(user);
  }
}
