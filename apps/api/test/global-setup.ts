import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-db';

export default function globalSetup() {
  // Ensure the dedicated test database exists (no-op if it already does).
  // Suites clean the tables they touch, so no force-reset is needed.
  // Try native docker first (Linux / Docker Desktop), then the WSL-Ubuntu form.
  const candidates = [
    'docker exec domar-postgres-dev createdb -U domar domar_test',
    'wsl -d Ubuntu docker exec domar-postgres-dev createdb -U domar domar_test',
  ];
  let created = false;
  let lastErr: unknown;
  for (const cmd of candidates) {
    try {
      execSync(cmd, { stdio: 'pipe' });
      created = true;
      break;
    } catch (e: unknown) {
      const msg = String((e as { stderr?: Buffer }).stderr ?? e);
      if (msg.includes('already exists')) {
        created = true;
        break;
      }
      lastErr = e;
    }
  }
  if (!created) throw lastErr;

  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
