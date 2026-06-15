import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

// Native (Capacitor) WebViews load from these origins, so cross-origin XHR from
// the mobile app must be allowed. Native clients use Bearer tokens (not cookies),
// so credentialed CORS is not required. Extra web origins can be added via
// CORS_ORIGINS (comma-separated).
const CAPACITOR_ORIGINS = [
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
];

function allowedOrigins(): string[] {
  const extra = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return [...CAPACITOR_ORIGINS, ...extra];
}

/** Shared between main.ts and e2e tests so both run the identical pipeline. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: allowedOrigins(),
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  return app;
}
