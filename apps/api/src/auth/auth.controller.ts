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
import { AuthService, type AuthTokens } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from './jwt-auth.guard';

type SafeUser = Omit<User, 'passwordHash'> & { companyName: string | null };

function toSafeUser(
  user: User & { company?: { name: string } | null },
): SafeUser {
  const { passwordHash: _passwordHash, company, ...safe } = user;
  return { ...safe, companyName: company?.name ?? null };
}

function refreshCookieOf(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
}

/**
 * Native clients (Capacitor) have no cookie jar, so they opt in via this header
 * to also receive the tokens in the response body. Web clients omit it and keep
 * using the httpOnly cookies set on every response — behavior is unchanged.
 */
function wantsBodyTokens(req: Request): boolean {
  return req.headers['x-client'] === 'mobile';
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SafeUser & Partial<AuthTokens>> {
    const tokens = await this.auth.login(dto.email, dto.password);
    setAuthCookies(res, tokens);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { email: dto.email },
      include: { company: { select: { name: true } } },
    });
    return { ...toSafeUser(user), ...(wantsBodyTokens(req) ? tokens : {}) };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true } & Partial<AuthTokens>> {
    const refreshToken = dto.refreshToken ?? refreshCookieOf(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokens = await this.auth.refresh(refreshToken);
    setAuthCookies(res, tokens);
    return { ok: true, ...(wantsBodyTokens(req) ? tokens : {}) };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const refreshToken = dto.refreshToken ?? refreshCookieOf(req);
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
      include: { company: { select: { name: true } } },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return toSafeUser(user);
  }
}
