import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Invites & User management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const jars = new Map<string, string>();
  const asUser = (email: string) => ({
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set('Cookie', jars.get(email)!),
    post: (url: string) =>
      request(app.getHttpServer()).post(url).set('Cookie', jars.get(email)!),
    patch: (url: string) =>
      request(app.getHttpServer()).patch(url).set('Cookie', jars.get(email)!),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.invite.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.jobComment.deleteMany();
    await prisma.job.deleteMany();
    await prisma.property.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await argon2.hash('Domar123!');
    await prisma.user.createMany({
      data: [
        { email: 'ana@domar.test', passwordHash, name: 'Ana', role: 'SUPERVISOR' },
        { email: 'marko@domar.test', passwordHash, name: 'Marko', role: 'WORKER' },
      ],
    });

    for (const email of ['ana@domar.test', 'marko@domar.test']) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Domar123!' })
        .expect(200);
      jars.set(
        email,
        res
          .get('Set-Cookie')!
          .map((c: string) => c.split(';')[0])
          .filter((c: string) => !c.endsWith('='))
          .join('; '),
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('invite flow', () => {
    it('supervisor invites a worker and gets a one-time link', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/invites')
        .send({ email: 'novi@domar.test', role: 'WORKER', skills: ['CLEANING'] })
        .expect(201);

      expect(res.body.inviteUrl).toContain('/invite/');
      expect(res.body.token).toBeTruthy();
    });

    it('the token can be inspected publicly and then consumed once', async () => {
      const invite = await asUser('ana@domar.test')
        .post('/api/invites')
        .send({ email: 'petra2@domar.test', role: 'WORKER', skills: ['CLEANING'] })
        .expect(201);
      const token = invite.body.token;

      const info = await request(app.getHttpServer())
        .get(`/api/invites/${token}`)
        .expect(200);
      expect(info.body.email).toBe('petra2@domar.test');
      expect(info.body.role).toBe('WORKER');

      await request(app.getHttpServer())
        .post(`/api/invites/${token}/accept`)
        .send({ name: 'Petra Druga', password: 'NewPass123!' })
        .expect(201);

      // user can log in now
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'petra2@domar.test', password: 'NewPass123!' })
        .expect(200);

      // reuse is rejected
      await request(app.getHttpServer())
        .post(`/api/invites/${token}/accept`)
        .send({ name: 'Imposter', password: 'Hax123456!' })
        .expect(400);
    });

    it('an expired token is rejected', async () => {
      const invite = await asUser('ana@domar.test')
        .post('/api/invites')
        .send({ email: 'late@domar.test', role: 'OWNER' })
        .expect(201);
      await prisma.invite.updateMany({
        where: { email: 'late@domar.test' },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await request(app.getHttpServer())
        .get(`/api/invites/${invite.body.token}`)
        .expect(400);
      await request(app.getHttpServer())
        .post(`/api/invites/${invite.body.token}/accept`)
        .send({ name: 'Too Late', password: 'Whatever123!' })
        .expect(400);
    });

    it('inviting an existing user email is rejected', async () => {
      await asUser('ana@domar.test')
        .post('/api/invites')
        .send({ email: 'marko@domar.test', role: 'WORKER' })
        .expect(400);
    });

    it('workers cannot invite', async () => {
      await asUser('marko@domar.test')
        .post('/api/invites')
        .send({ email: 'x@domar.test', role: 'WORKER' })
        .expect(403);
    });
  });

  describe('user management', () => {
    it('supervisor deactivates and reactivates a user', async () => {
      const users = await asUser('ana@domar.test')
        .get('/api/users?role=WORKER')
        .expect(200);
      const marko = users.body.find(
        (u: { email: string }) => u.email === 'marko@domar.test',
      );

      const off = await asUser('ana@domar.test')
        .patch(`/api/users/${marko.id}`)
        .send({ isActive: false })
        .expect(200);
      expect(off.body.isActive).toBe(false);

      // deactivated users disappear from the default list
      const activeOnly = await asUser('ana@domar.test')
        .get('/api/users?role=WORKER')
        .expect(200);
      expect(
        activeOnly.body.some(
          (u: { email: string }) => u.email === 'marko@domar.test',
        ),
      ).toBe(false);

      // but appear with includeInactive
      const all = await asUser('ana@domar.test')
        .get('/api/users?role=WORKER&includeInactive=true')
        .expect(200);
      expect(
        all.body.some(
          (u: { email: string }) => u.email === 'marko@domar.test',
        ),
      ).toBe(true);

      await asUser('ana@domar.test')
        .patch(`/api/users/${marko.id}`)
        .send({ isActive: true })
        .expect(200);
    });

    it('supervisor cannot deactivate themselves', async () => {
      const me = await asUser('ana@domar.test').get('/api/auth/me').expect(200);
      await asUser('ana@domar.test')
        .patch(`/api/users/${me.body.id}`)
        .send({ isActive: false })
        .expect(400);
    });
  });

  describe('owner property access', () => {
    it('an owner lists only their own properties', async () => {
      const klausInvite = await asUser('ana@domar.test')
        .post('/api/invites')
        .send({ email: 'klaus@domar.test', role: 'OWNER' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/invites/${klausInvite.body.token}/accept`)
        .send({ name: 'Klaus', password: 'Klaus1234!' })
        .expect(201);
      const klaus = await prisma.user.findUniqueOrThrow({
        where: { email: 'klaus@domar.test' },
      });
      await prisma.property.create({
        data: { name: 'Villa K', address: 'K 1', ownerId: klaus.id },
      });
      await prisma.property.create({
        data: { name: 'Villa Other', address: 'O 1' },
      });

      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'klaus@domar.test', password: 'Klaus1234!' })
        .expect(200);
      const jar = login
        .get('Set-Cookie')!
        .map((c: string) => c.split(';')[0])
        .filter((c: string) => !c.endsWith('='))
        .join('; ');

      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Cookie', jar)
        .expect(200);
      expect(res.body.map((p: { name: string }) => p.name)).toEqual(['Villa K']);

      // and still cannot create
      await request(app.getHttpServer())
        .post('/api/properties')
        .set('Cookie', jar)
        .send({ name: 'Nope', address: 'No 1' })
        .expect(403);
    });
  });
});
