import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Same server as development (apps/api/.env), separate database, so a
// non-default host/port only has to be configured once.
const envFile = join(__dirname, '..', '.env');
if (!process.env.DATABASE_URL && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

const DEV_DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://domar:domar@127.0.0.1:5432/domar?schema=public';

/** Dedicated database for e2e runs; override with TEST_DATABASE_URL. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? withDatabase(DEV_DATABASE_URL, 'domar_test');

/** Maintenance database on the same server, used to create the test one. */
export const ADMIN_DATABASE_URL = withDatabase(TEST_DATABASE_URL, 'postgres');
