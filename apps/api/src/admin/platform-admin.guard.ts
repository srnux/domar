import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';

/**
 * Guards the platform-admin plane (`/admin/*`). Runs after JwtAuthGuard. A
 * platform admin is identified by the `isPlatformAdmin` flag (not a Role enum
 * value), so the tenant role switches elsewhere are untouched.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin only');
    }
    return true;
  }
}
