import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from './tenant-context.service';
import { tenantExtension } from './tenant.extension';

/**
 * Tenant-aware Prisma client. Stays a singleton (one connection pool) — tenancy
 * flows via AsyncLocalStorage, NOT a request-scoped provider (which would
 * cascade request scope through the whole DI graph and kill the pool).
 *
 * The constructor returns a Proxy that delegates model delegates and `$`-methods
 * to a `$extends`-ed client (so `this.prisma.user.findMany()` auto-scopes by
 * companyId), while lifecycle hooks resolve to this instance.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(tenantContext: TenantContextService) {
    super();
    const extended = this.$extends(tenantExtension(tenantContext));
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        const value = (extended as Record<string | symbol, unknown>)[prop];
        if (value !== undefined) {
          return typeof value === 'function' ? value.bind(extended) : value;
        }
        return Reflect.get(target, prop, receiver) as unknown;
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
