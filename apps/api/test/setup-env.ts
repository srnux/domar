import { TEST_DATABASE_URL } from './test-db';

import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'e2e-test-secret';
process.env.UPLOADS_DIR = join(tmpdir(), 'domar-e2e-uploads');
