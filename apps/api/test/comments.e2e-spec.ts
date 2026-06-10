import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Comments & Verification (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let villaId: string;
  let markoId: string;

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
    await prisma.jobComment.deleteMany();
    await prisma.jobPhoto.deleteMany();
    await prisma.checklistItem.deleteMany();
    await prisma.checklistTemplateItem.deleteMany();
    await prisma.checklistTemplate.deleteMany();
    await prisma.job.deleteMany();
    await prisma.property.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await argon2.hash('Domar123!');
    await prisma.user.createMany({
      data: [
        { email: 'ana@domar.test', passwordHash, name: 'Ana', role: 'SUPERVISOR' },
        { email: 'marko@domar.test', passwordHash, name: 'Marko', role: 'WORKER' },
        { email: 'petra@domar.test', passwordHash, name: 'Petra', role: 'WORKER' },
        { email: 'klaus@domar.test', passwordHash, name: 'Klaus', role: 'OWNER' },
        { email: 'lena@domar.test', passwordHash, name: 'Lena', role: 'OWNER' },
      ],
    });
    const users = await prisma.user.findMany();
    const idOf = (email: string) => users.find((u) => u.email === email)!.id;
    markoId = idOf('marko@domar.test');
    villaId = (
      await prisma.property.create({
        data: {
          name: 'Villa Borik',
          address: 'Borik 1, Zadar',
          ownerId: idOf('klaus@domar.test'),
        },
      })
    ).id;

    for (const email of users.map((u) => u.email)) {
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

  const hours = (n: number) => new Date(Date.now() + n * 3600_000).toISOString();

  async function createJob(): Promise<string> {
    const res = await asUser('ana@domar.test')
      .post('/api/jobs')
      .send({
        propertyId: villaId,
        type: 'REPAIR',
        title: 'Comment playground',
        scheduledStart: hours(1),
        scheduledEnd: hours(2),
        assignedWorkerId: markoId,
      })
      .expect(201);
    return res.body.id;
  }

  describe('posting', () => {
    it('worker posts an internal comment on their job', async () => {
      const jobId = await createJob();
      const res = await asUser('marko@domar.test')
        .post(`/api/jobs/${jobId}/comments`)
        .send({ body: 'Grout looks bad', visibility: 'INTERNAL' })
        .expect(201);
      expect(res.body.visibility).toBe('INTERNAL');
      expect(res.body.author.name).toBe('Marko');
    });

    it('owner comments are forced to SHARED even if INTERNAL is requested', async () => {
      const jobId = await createJob();
      const res = await asUser('klaus@domar.test')
        .post(`/api/jobs/${jobId}/comments`)
        .send({ body: 'Please be careful with the new sofa', visibility: 'INTERNAL' })
        .expect(201);
      expect(res.body.visibility).toBe('SHARED');
    });

    it('an unassigned worker cannot comment', async () => {
      const jobId = await createJob();
      await asUser('petra@domar.test')
        .post(`/api/jobs/${jobId}/comments`)
        .send({ body: 'hi', visibility: 'INTERNAL' })
        .expect(404);
    });

    it('an unrelated owner cannot comment', async () => {
      const jobId = await createJob();
      await asUser('lena@domar.test')
        .post(`/api/jobs/${jobId}/comments`)
        .send({ body: 'hi', visibility: 'SHARED' })
        .expect(404);
    });

    it('rejects an empty body', async () => {
      const jobId = await createJob();
      await asUser('ana@domar.test')
        .post(`/api/jobs/${jobId}/comments`)
        .send({ body: '', visibility: 'INTERNAL' })
        .expect(400);
    });
  });

  describe('reading with visibility rules', () => {
    let jobId: string;

    beforeAll(async () => {
      jobId = await createJob();
      await asUser('marko@domar.test')
        .post(`/api/jobs/${jobId}/comments`)
        .send({ body: 'internal note', visibility: 'INTERNAL' })
        .expect(201);
      await asUser('ana@domar.test')
        .post(`/api/jobs/${jobId}/comments`)
        .send({ body: 'shared update', visibility: 'SHARED' })
        .expect(201);
    });

    it('supervisor and worker see both', async () => {
      for (const email of ['ana@domar.test', 'marko@domar.test']) {
        const res = await asUser(email)
          .get(`/api/jobs/${jobId}/comments`)
          .expect(200);
        expect(res.body).toHaveLength(2);
      }
    });

    it('the owner sees only SHARED', async () => {
      const res = await asUser('klaus@domar.test')
        .get(`/api/jobs/${jobId}/comments`)
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].body).toBe('shared update');
    });

    it('an unrelated owner sees nothing at all', async () => {
      await asUser('lena@domar.test')
        .get(`/api/jobs/${jobId}/comments`)
        .expect(404);
    });
  });

  describe('reopen creates an internal comment', () => {
    it('DONE → ASSIGNED with reason lands in the thread', async () => {
      const jobId = await createJob();
      const move = (email: string, body: Record<string, unknown>) =>
        asUser(email).patch(`/api/jobs/${jobId}/transition`).send(body);

      await move('marko@domar.test', { to: 'ACCEPTED' }).expect(200);
      await move('marko@domar.test', { to: 'IN_PROGRESS' }).expect(200);
      await move('marko@domar.test', { to: 'DONE' }).expect(200);
      await move('ana@domar.test', {
        to: 'ASSIGNED',
        reason: 'Balcony was skipped, please redo',
      }).expect(200);

      const res = await asUser('marko@domar.test')
        .get(`/api/jobs/${jobId}/comments`)
        .expect(200);
      const reopen = res.body.find((c: { body: string }) =>
        c.body.includes('Balcony was skipped'),
      );
      expect(reopen).toBeDefined();
      expect(reopen.visibility).toBe('INTERNAL');
    });
  });
});
