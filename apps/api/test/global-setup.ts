import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-db';

export default function globalSetup() {
  // Ensure the dedicated test database exists (no-op if it already does).
  // Suites clean the tables they touch, so no force-reset is needed.
  try {
    execSync(
      'wsl -d Ubuntu docker exec domar-postgres-dev createdb -U domar domar_test',
      { stdio: 'pipe' },
    );
  } catch (e: unknown) {
    const msg = String((e as { stderr?: Buffer }).stderr ?? e);
    if (!msg.includes('already exists')) throw e;
  }

  execSync('pnpm exec prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
