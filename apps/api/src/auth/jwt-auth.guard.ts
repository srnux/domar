import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { TenantContextService } from '../prisma/tenant-context.service';
import { ACCESS_COOKIE } from './auth.cookies';
import type { AccessTokenPayload } from './auth.service';

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}

/** Native clients (no cookie jar) send the access token as a Bearer header. */
function bearerOf(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim() || undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token =
      bearerOf(req) ??
      (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }
    try {
      req.user = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
    // Populate the request-scoped tenant store (opened by TenantContextMiddleware)
    // so Prisma auto-scopes this request's queries to the user's company.
    this.tenantContext.set({
      companyId: req.user.companyId ?? null,
      isPlatformAdmin: req.user.isPlatformAdmin ?? false,
      authenticated: true,
    });
    return true;
  }
}
