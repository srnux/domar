import { Prisma } from '@prisma/client';
import type { TenantContextService } from './tenant-context.service';

/**
 * Models carrying a direct `companyId` column that the extension auto-scopes.
 * Transitive models (JobPhoto, JobComment, JobRating, ChecklistItem, …) have no
 * `companyId` and are isolated by always querying through a scoped parent.
 * RefreshToken is intentionally excluded — auth flows run unauthenticated (no
 * context), so its companyId is set explicitly in AuthService.
 */
const TENANT_MODELS = new Set<string>([
  'User',
  'Property',
  'Job',
  'Bill',
  'BillLineItem',
  'Booking',
  'Invite',
  'Bid',
]);

/** Operations whose `where` clause can safely be augmented with `companyId`. */
const WHERE_OPS = new Set<string>([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

/**
 * Auto-injects the active tenant's `companyId` into reads/writes on tenant
 * models. Notes:
 * - `findUnique`/`findUniqueOrThrow`/`update`/`delete`/`upsert` accept only
 *   unique fields in `where`, so they CANNOT be scoped here — those call sites
 *   are converted to `findFirst`/guarded with companyId manually (see plan).
 * - Fails closed: an authenticated request with no companyId throws rather than
 *   returning cross-tenant data.
 */
export function tenantExtension(tenantContext: TenantContextService) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'tenant-isolation',
      query: {
        $allModels: {
          // eslint-disable-next-line @typescript-eslint/require-await
          async $allOperations({ model, operation, args, query }) {
            if (!TENANT_MODELS.has(model)) {
              return query(args);
            }

            const store = tenantContext.get();

            // Public/system context (login, bootstrap, seed) or platform admin:
            // run unscoped. Admins operate above tenants by design.
            if (!store || !store.authenticated || store.isPlatformAdmin) {
              return query(args);
            }

            if (!store.companyId) {
              throw new Error(
                `Tenant isolation: authenticated request has no companyId (${model}.${operation})`,
              );
            }
            const companyId = store.companyId;
            const a = args as Record<string, unknown>;

            if (WHERE_OPS.has(operation)) {
              a.where = { ...(a.where as object), companyId };
              return query(args);
            }

            if (operation === 'create') {
              a.data = { ...(a.data as object), companyId };
              return query(args);
            }

            if (operation === 'createMany') {
              const data = a.data;
              a.data = Array.isArray(data)
                ? data.map((d) => ({ ...(d as object), companyId }))
                : { ...(data as object), companyId };
              return query(args);
            }

            // Unique-where ops (findUnique/update/delete/upsert): cannot inject.
            // Guarded at the call site.
            return query(args);
          },
        },
      },
    }),
  );
}
