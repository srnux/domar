import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PASSWORD = 'Domar123!';

async function main() {
  const passwordHash = await argon2.hash(PASSWORD);

  await prisma.user.upsert({
    where: { email: 'ana@domar.test' },
    update: {},
    create: {
      email: 'ana@domar.test',
      passwordHash,
      name: 'Ana Supervizor',
      role: 'SUPERVISOR',
      phone: '+385 91 000 0001',
    },
  });

  console.log(`Seeded supervisor ana@domar.test (password: ${PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
