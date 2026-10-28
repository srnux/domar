import { execSync } from 'node:child_process';
import { ADMIN_DATABASE_URL, TEST_DATABASE_URL } from './test-db';

export default function globalSetup() {
  // Ensure the dedicated test database exists (no-op if it already does).
  // Suites clean the tables they touch, so no force-reset is needed.
  // Goes through Prisma, not docker exec, so any reachable Postgres works.
  const database = new URL(TEST_DATABASE_URL).pathname.slice(1);
  try {
    execSync(`npx prisma db execute --stdin --url "${ADMIN_DATABASE_URL}"`, {
      cwd: `${__dirname}/..`,
      input: `CREATE DATABASE "${database}";`,
      stdio: 'pipe',
    });
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    const output = String(err.stdout ?? '') + String(err.stderr ?? '');
    if (!output.includes('already exists')) throw e;
  }

  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
