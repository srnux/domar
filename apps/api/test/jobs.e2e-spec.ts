import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Jobs & Properties (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let villaId: string;
  let studioId: string;
  let markoId: string;
  let petraId: string;

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
    await prisma.job.deleteMany();
    await prisma.property.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

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
        {
          email: 'petra@domar.test',
          passwordHash,
          name: 'Petra',
          role: 'WORKER',
          skills: ['CLEANING', 'ELECTRICAL'],
        },
        {
          email: 'klaus@domar.test',
          passwordHash,
          name: 'Klaus',
          role: 'OWNER',
        },
        { email: 'lena@domar.test', passwordHash, name: 'Lena', role: 'OWNER' },
      ],
    });
    const users = await prisma.user.findMany();
    const idOf = (email: string) => users.find((u) => u.email === email)!.id;
    markoId = idOf('marko@domar.test');
    petraId = idOf('petra@domar.test');

    const villa = await prisma.property.create({
      data: {
        name: 'Villa Borik',
        address: 'Borik 1, Zadar',
        accessNotes: 'Key box 1234',
        ownerId: idOf('klaus@domar.test'),
      },
    });
    villaId = villa.id;
    const studio = await prisma.property.create({
      data: {
        name: 'Studio Kolovare',
        address: 'Kolovare 5, Zadar',
        ownerId: idOf('lena@domar.test'),
      },
    });
    studioId = studio.id;

    for (const email of [
      'ana@domar.test',
      'marko@domar.test',
      'petra@domar.test',
      'klaus@domar.test',
      'lena@domar.test',
    ]) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Domar123!' })
        .expect(200);
      const cookies = res.get('Set-Cookie')!;
      jars.set(
        email,
        cookies
          .map((c: string) => c.split(';')[0])
          .filter((c: string) => !c.endsWith('='))
          .join('; '),
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const tomorrow = (h: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };

  const jobPayload = (overrides: Record<string, unknown> = {}) => ({
    propertyId: villaId,
    type: 'CLEANING',
    title: 'Turnover cleaning',
    scheduledStart: tomorrow(10),
    scheduledEnd: tomorrow(13),
    ...overrides,
  });

  describe('POST /api/jobs', () => {
    it('supervisor creates a draft job (no worker)', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload())
        .expect(201);

      expect(res.body.status).toBe('DRAFT');
      expect(res.body.property.name).toBe('Villa Borik');
      expect(res.body.assignedWorker).toBeNull();
      expect(res.body.allowedTransitions).toContain('ASSIGNED');
    });

    it('supervisor creates a directly-assigned job', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ assignedWorkerId: markoId }))
        .expect(201);

      expect(res.body.status).toBe('ASSIGNED');
      expect(res.body.assignedWorker.name).toBe('Marko');
    });

    it('rejects an end before the start', async () => {
      await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(
          jobPayload({
            scheduledStart: tomorrow(13),
            scheduledEnd: tomorrow(10),
          }),
        )
        .expect(400);
    });

    it('rejects assignment to a non-worker', async () => {
      await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ assignedWorkerId: petraId.replace(/./, 'f') }))
        .expect(400);
    });

    it('workers and owners cannot create jobs', async () => {
      await asUser('marko@domar.test')
        .post('/api/jobs')
        .send(jobPayload())
        .expect(403);
      await asUser('klaus@domar.test')
        .post('/api/jobs')
        .send(jobPayload())
        .expect(403);
    });
  });

  describe('GET /api/jobs (role scoping)', () => {
    let markoJobId: string;

    beforeAll(async () => {
      await prisma.job.deleteMany();
      const created = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(
          jobPayload({ assignedWorkerId: markoId, title: 'Marko villa job' }),
        );
      markoJobId = created.body.id;
      await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(
          jobPayload({
            propertyId: studioId,
            assignedWorkerId: petraId,
            title: 'Petra studio job',
          }),
        );
      await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ title: 'Unassigned villa job' }));
    });

    it('supervisor sees all jobs', async () => {
      const res = await asUser('ana@domar.test').get('/api/jobs').expect(200);
      expect(res.body).toHaveLength(3);
    });

    it('a worker sees only their assigned jobs', async () => {
      const res = await asUser('marko@domar.test').get('/api/jobs').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Marko villa job');
    });

    it('an owner sees only jobs on their properties', async () => {
      const res = await asUser('klaus@domar.test').get('/api/jobs').expect(200);
      expect(res.body.map((j: { title: string }) => j.title).sort()).toEqual([
        'Marko villa job',
        'Unassigned villa job',
      ]);
    });

    it('an owner gets no worker transitions offered', async () => {
      const res = await asUser('klaus@domar.test').get('/api/jobs').expect(200);
      for (const job of res.body) {
        expect(job.allowedTransitions).toEqual([]);
      }
    });

    it('GET /api/jobs/:id respects the same scoping', async () => {
      await asUser('marko@domar.test')
        .get(`/api/jobs/${markoJobId}`)
        .expect(200);
      await asUser('lena@domar.test')
        .get(`/api/jobs/${markoJobId}`)
        .expect(404);
      await asUser('petra@domar.test')
        .get(`/api/jobs/${markoJobId}`)
        .expect(404);
    });
  });

  describe('job lifecycle via PATCH /api/jobs/:id/transition', () => {
    let jobId: string;

    beforeAll(async () => {
      await prisma.job.deleteMany();
      const res = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(
          jobPayload({ assignedWorkerId: markoId, title: 'Lifecycle job' }),
        );
      jobId = res.body.id;
    });

    const transition = (
      email: string,
      body: Record<string, unknown>,
      expected: number,
    ) =>
      asUser(email)
        .patch(`/api/jobs/${jobId}/transition`)
        .send(body)
        .expect(expected);

    it('walks ASSIGNED → ACCEPTED → IN_PROGRESS → DONE → VERIFIED', async () => {
      const accepted = await transition(
        'marko@domar.test',
        { to: 'ACCEPTED' },
        200,
      );
      expect(accepted.body.status).toBe('ACCEPTED');

      await transition('marko@domar.test', { to: 'IN_PROGRESS' }, 200);

      const done = await transition(
        'marko@domar.test',
        { to: 'DONE', workerNotes: 'All clean, AC filter looks old.' },
        200,
      );
      expect(done.body.workerNotes).toContain('AC filter');

      const verified = await transition(
        'ana@domar.test',
        { to: 'VERIFIED' },
        200,
      );
      expect(verified.body.status).toBe('VERIFIED');
    });

    it('rejects an illegal transition with 409', async () => {
      // job is VERIFIED now — nothing may move
      await transition('ana@domar.test', { to: 'ASSIGNED', reason: 'x' }, 409);
      await transition('marko@domar.test', { to: 'IN_PROGRESS' }, 409);
    });

    it('a worker not assigned to the job cannot act on it', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ assignedWorkerId: markoId, title: 'Petra denied' }));
      await asUser('petra@domar.test')
        .patch(`/api/jobs/${res.body.id}/transition`)
        .send({ to: 'ACCEPTED' })
        .expect(404); // scoping hides it before the machine is even asked
    });

    it('decline requires a reason and records it', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ assignedWorkerId: markoId, title: 'Decline me' }));
      const id = res.body.id;

      await asUser('marko@domar.test')
        .patch(`/api/jobs/${id}/transition`)
        .send({ to: 'DECLINED' })
        .expect(409);

      const declined = await asUser('marko@domar.test')
        .patch(`/api/jobs/${id}/transition`)
        .send({ to: 'DECLINED', reason: 'Sick that day' })
        .expect(200);
      expect(declined.body.statusReason).toBe('Sick that day');

      // supervisor reassigns to petra
      const reassigned = await asUser('ana@domar.test')
        .patch(`/api/jobs/${id}/transition`)
        .send({ to: 'ASSIGNED', assignedWorkerId: petraId })
        .expect(200);
      expect(reassigned.body.assignedWorker.name).toBe('Petra');
      expect(reassigned.body.status).toBe('ASSIGNED');
    });

    it('owners cannot transition anything', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ title: 'Owner hands off' }));
      await asUser('klaus@domar.test')
        .patch(`/api/jobs/${res.body.id}/transition`)
        .send({ to: 'CANCELLED' })
        .expect(409);
    });
  });

  describe('pricing', () => {
    beforeAll(async () => {
      await prisma.job.deleteMany();
    });

    it('creates a fixed-price job', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ priceType: 'FIXED', priceCents: 8000 }))
        .expect(201);
      expect(res.body.priceType).toBe('FIXED');
      expect(res.body.priceCents).toBe(8000);
      expect(res.body.currency).toBe('EUR');
    });

    it('creates an hourly job with estimated hours and a currency', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(
          jobPayload({
            priceType: 'HOURLY',
            priceCents: 1500,
            estimatedHours: 3,
            currency: 'USD',
          }),
        )
        .expect(201);
      expect(res.body.priceType).toBe('HOURLY');
      expect(res.body.estimatedHours).toBe(3);
      expect(res.body.currency).toBe('USD');
    });

    it('rejects FIXED/HOURLY without an amount', async () => {
      await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ priceType: 'FIXED' }))
        .expect(400);
    });

    it('rejects NEGOTIABLE pricing (reserved for Phase 2)', async () => {
      await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ priceType: 'NEGOTIABLE' }))
        .expect(400);
    });

    it('supervisor edits price while the job is DRAFT', async () => {
      const created = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ priceType: 'FIXED', priceCents: 5000 }));
      const updated = await asUser('ana@domar.test')
        .patch(`/api/jobs/${created.body.id}`)
        .send({ priceType: 'HOURLY', priceCents: 2000, estimatedHours: 4 })
        .expect(200);
      expect(updated.body.priceType).toBe('HOURLY');
      expect(updated.body.priceCents).toBe(2000);
      expect(updated.body.estimatedHours).toBe(4);
    });

    it('non-supervisors cannot edit price', async () => {
      const created = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(jobPayload({ priceType: 'FIXED', priceCents: 5000 }));
      await asUser('marko@domar.test')
        .patch(`/api/jobs/${created.body.id}`)
        .send({ priceCents: 1 })
        .expect(403);
    });

    it('rejects a price edit once work has started', async () => {
      const created = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(
          jobPayload({
            assignedWorkerId: markoId,
            priceType: 'HOURLY',
            priceCents: 1500,
          }),
        );
      const id = created.body.id;
      await asUser('marko@domar.test')
        .patch(`/api/jobs/${id}/transition`)
        .send({ to: 'ACCEPTED' })
        .expect(200);
      await asUser('marko@domar.test')
        .patch(`/api/jobs/${id}/transition`)
        .send({ to: 'IN_PROGRESS' })
        .expect(200);

      await asUser('ana@domar.test')
        .patch(`/api/jobs/${id}`)
        .send({ priceCents: 9999 })
        .expect(400);
    });

    it('records worker spent hours when finishing an hourly job', async () => {
      const created = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send(
          jobPayload({
            assignedWorkerId: markoId,
            type: 'OTHER',
            title: 'Hourly finish',
            priceType: 'HOURLY',
            priceCents: 2000,
          }),
        );
      const id = created.body.id;
      await asUser('marko@domar.test')
        .patch(`/api/jobs/${id}/transition`)
        .send({ to: 'ACCEPTED' })
        .expect(200);
      await asUser('marko@domar.test')
        .patch(`/api/jobs/${id}/transition`)
        .send({ to: 'IN_PROGRESS' })
        .expect(200);
      const done = await asUser('marko@domar.test')
        .patch(`/api/jobs/${id}/transition`)
        .send({ to: 'DONE', spentHours: 2.5 })
        .expect(200);
      expect(done.body.spentHours).toBe(2.5);
    });
  });

  describe('properties', () => {
    it('supervisor creates and lists properties', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/properties')
        .send({ name: 'Apartment Diklo', address: 'Diklo 9, Zadar' })
        .expect(201);
      expect(res.body.name).toBe('Apartment Diklo');

      const list = await asUser('ana@domar.test')
        .get('/api/properties')
        .expect(200);
      expect(list.body.length).toBeGreaterThanOrEqual(3);
    });

    it('supervisor updates a property', async () => {
      const res = await asUser('ana@domar.test')
        .patch(`/api/properties/${villaId}`)
        .send({ accessNotes: 'Key box 9999' })
        .expect(200);
      expect(res.body.accessNotes).toBe('Key box 9999');
    });

    it('workers and owners cannot manage properties', async () => {
      await asUser('marko@domar.test').get('/api/properties').expect(403);
      await asUser('klaus@domar.test')
        .post('/api/properties')
        .send({ name: 'X', address: 'Y' })
        .expect(403);
    });
  });
});
