import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Creates a single fresh tenant for an e2e suite and returns its id. Suites
 * stamp this id onto their users (via updateMany) and properties so the
 * tenant-scoped endpoints resolve correctly.
 */
export async function freshTenant(
  prisma: PrismaService,
  name = 'Test Co',
  maxSeats = 100,
): Promise<string> {
  const company = await prisma.company.create({ data: { name, maxSeats } });
  return company.id;
}
