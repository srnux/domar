import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { Roles } from '../src/auth/roles.decorator';
import { RolesGuard } from '../src/auth/roles.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { freshTenant } from './fixtures';

/** Probe routes for guard behavior, not part of the real API surface. */
@Controller('probe')
@UseGuards(JwtAuthGuard, RolesGuard)
class ProbeController {
  @Get('supervisor-only')
  @Roles('SUPERVISOR')
  supervisorOnly() {
    return { ok: true };
  }

  @Get('any-authenticated')
  anyAuthenticated() {
    return { ok: true };
  }
}

function cookiesOf(res: request.Response): string[] {
  const raw = res.get('Set-Cookie');
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

/** Extracts "name=value" pairs to send back, from Set-Cookie headers. */
function cookieJar(res: request.Response): string {
  return cookiesOf(res)
    .map((c) => c.split(';')[0])
    .filter((c) => !c.endsWith('='))
    .join('; ');
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, AuthModule],
      controllers: [ProbeController],
    }).compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
    const passwordHash = await argon2.hash('Domar123!');
    await prisma.user.createMany({
      data: [
        {
          email: 'ana@domar.test',
          passwordHash,
          name: 'Ana',
          role: 'SUPERVISOR',
        },
        {
          email: 'marko@domar.test',
          passwordHash,
          name: 'Marko',
          role: 'WORKER',
          skills: ['CLEANING'],
        },
      ],
    });
    const companyId = await freshTenant(prisma);
    await prisma.user.updateMany({ data: { companyId } });
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (email = 'ana@domar.test', password = 'Domar123!') =>
    request(app.getHttpServer()).post('/api/auth/login').send({
      email,
      password,
    });

  describe('POST /api/auth/login', () => {
    it('sets httpOnly access and refresh cookies and returns the user', async () => {
      const res = await login().expect(200);

      expect(res.body.email).toBe('ana@domar.test');
      expect(res.body.role).toBe('SUPERVISOR');
      expect(res.body.passwordHash).toBeUndefined();

      const cookies = cookiesOf(res);
      const access = cookies.find((c) => c.startsWith('access_token='));
      const refresh = cookies.find((c) => c.startsWith('refresh_token='));
      expect(access).toMatch(/HttpOnly/i);
      expect(access).toMatch(/SameSite=Lax/i);
      expect(refresh).toMatch(/HttpOnly/i);
      expect(refresh).toMatch(/Path=\/api\/auth/i);
    });

    it('rejects bad credentials with 401', async () => {
      await login('ana@domar.test', 'nope').expect(401);
    });

    it('rejects a malformed body with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '' })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the user for a valid access cookie', async () => {
      const jar = cookieJar(await login());

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', jar)
        .expect(200);

      expect(res.body.email).toBe('ana@domar.test');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('returns 401 without a cookie', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates the refresh token and issues fresh cookies', async () => {
      const first = await login();
      const firstJar = cookieJar(first);

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', firstJar)
        .expect(200);

      const newJar = cookieJar(res);
      expect(newJar).toContain('access_token=');
      expect(newJar).toContain('refresh_token=');
      expect(newJar).not.toBe(firstJar);

      // the consumed refresh token must be rejected
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', firstJar)
        .expect(401);
    });

    it('returns 401 without a refresh cookie', async () => {
      await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes the refresh token and clears cookies', async () => {
      const jar = cookieJar(await login());

      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', jar)
        .expect(200);

      // cleared cookies have empty values
      const cleared = cookiesOf(res);
      expect(cleared.some((c) => c.startsWith('access_token=;'))).toBe(true);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', jar)
        .expect(401);
    });
  });

  describe('mobile (Bearer) flow', () => {
    const mobileLogin = (email = 'ana@domar.test', password = 'Domar123!') =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Client', 'mobile')
        .send({ email, password });

    it('returns access and refresh tokens in the body for mobile clients', async () => {
      const res = await mobileLogin().expect(200);
      expect(res.body.email).toBe('ana@domar.test');
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('does not leak tokens in the body for web clients', async () => {
      const res = await login().expect(200);
      expect(res.body.accessToken).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();
    });

    it('authenticates a guarded route with a Bearer access token', async () => {
      const { accessToken } = (await mobileLogin()).body;

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe('ana@domar.test');
    });

    it('rotates a refresh token presented in the body', async () => {
      const { refreshToken } = (await mobileLogin()).body;

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('X-Client', 'mobile')
        .send({ refreshToken })
        .expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(res.body.refreshToken).not.toBe(refreshToken);

      // the consumed refresh token must be rejected
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('X-Client', 'mobile')
        .send({ refreshToken })
        .expect(401);
    });

    it('revokes a body-presented refresh token on logout', async () => {
      const { refreshToken } = (await mobileLogin()).body;

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('POST/DELETE /api/devices', () => {
    it('registers and unregisters a device token for the user', async () => {
      const jar = cookieJar(await login('marko@domar.test'));
      const token = 'fcm-test-token-123';

      await request(app.getHttpServer())
        .post('/api/devices')
        .set('Cookie', jar)
        .send({ token, platform: 'android' })
        .expect(200);

      const stored = await prisma.deviceToken.findUnique({ where: { token } });
      expect(stored?.platform).toBe('android');

      await request(app.getHttpServer())
        .delete(`/api/devices/${token}`)
        .set('Cookie', jar)
        .expect(200);

      const gone = await prisma.deviceToken.findUnique({ where: { token } });
      expect(gone).toBeNull();
    });

    it('rejects an unauthenticated registration with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/devices')
        .send({ token: 'x', platform: 'android' })
        .expect(401);
    });

    it('rejects an invalid platform with 400', async () => {
      const jar = cookieJar(await login('marko@domar.test'));
      await request(app.getHttpServer())
        .post('/api/devices')
        .set('Cookie', jar)
        .send({ token: 'y', platform: 'windows-phone' })
        .expect(400);
    });
  });

  describe('role guard', () => {
    it('lets a supervisor into a supervisor-only route', async () => {
      const jar = cookieJar(await login('ana@domar.test'));

      await request(app.getHttpServer())
        .get('/api/probe/supervisor-only')
        .set('Cookie', jar)
        .expect(200);
    });

    it('gives a worker 403 on a supervisor-only route', async () => {
      const jar = cookieJar(await login('marko@domar.test'));

      await request(app.getHttpServer())
        .get('/api/probe/supervisor-only')
        .set('Cookie', jar)
        .expect(403);
    });

    it('lets any authenticated user into an unrestricted guarded route', async () => {
      const jar = cookieJar(await login('marko@domar.test'));

      await request(app.getHttpServer())
        .get('/api/probe/any-authenticated')
        .set('Cookie', jar)
        .expect(200);
    });
  });
});
