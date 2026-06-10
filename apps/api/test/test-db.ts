/** Dedicated database for e2e runs — wiped by global setup on every run. */
export const TEST_DATABASE_URL =
  'postgresql://domar:domar@127.0.0.1:5432/domar_test?schema=public';
