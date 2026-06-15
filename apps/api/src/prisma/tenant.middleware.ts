import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantContextService } from './tenant-context.service';

/**
 * Opens the per-request tenant ALS scope. Runs as Express middleware (before
 * guards) so the entire downstream chain — JwtAuthGuard, interceptors, the
 * controller and its async work — inherits the same store. The store starts
 * unauthenticated; JwtAuthGuard fills in companyId/isPlatformAdmin once the JWT
 * is verified.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(_req: Request, _res: Response, next: NextFunction): void {
    this.tenantContext.run(
      { companyId: null, isPlatformAdmin: false, authenticated: false },
      () => next(),
    );
  }
}
