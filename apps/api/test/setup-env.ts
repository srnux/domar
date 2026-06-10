import { TEST_DATABASE_URL } from './test-db';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'e2e-test-secret';
