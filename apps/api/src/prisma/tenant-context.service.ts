import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request tenant context. `authenticated` distinguishes public routes
 * (login/refresh/health — no tenant) from authenticated ones; the Prisma tenant
 * extension fails closed only for authenticated-but-companyless requests.
 */
export interface TenantStore {
  companyId: string | null;
  isPlatformAdmin: boolean;
  authenticated: boolean;
}

@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  /**
   * Opens an ALS scope for the remainder of the request. Called from middleware
   * (which runs inside the Express chain, so guards + handler inherit the store).
   */
  run<T>(store: TenantStore, callback: () => T): T {
    return this.als.run(store, callback);
  }

  /** Mutates the current request's store. Called from the auth guard once the JWT is verified. */
  set(patch: Partial<TenantStore>): void {
    const current = this.als.getStore();
    if (current) Object.assign(current, patch);
  }

  get(): TenantStore | undefined {
    return this.als.getStore();
  }

  /** The active tenant id, or throws — for code paths that must be tenant-scoped. */
  getCompanyIdOrThrow(): string {
    const companyId = this.als.getStore()?.companyId;
    if (!companyId) {
      throw new Error('No tenant company in the current request context');
    }
    return companyId;
  }
}
