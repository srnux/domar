import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Bids (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let propertyId: string;

  const jars = new Map<string, string>();
  const asUser = (email: string) => ({
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set('Cookie', jars.get(email)!),
    post: (url: string) =>
      request(app.getHttpServer()).post(url).set('Cookie', jars.get(email)!),
    patch: (url: string) =>
      request(app.getHttpServer()).patch(url).set('Cookie', jars.get(email)!),
    delete: (url: string) =>
      request(app.getHttpServer()).delete(url).set('Cookie', jars.get(email)!),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.bid.deleteMany();
    await prisma.job.deleteMany();
    await prisma.property.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await argon2.hash('Domar123!');
    await prisma.user.createMany({
      data: [
        { email: 'ana@domar.test', passwordHash, name: 'Ana', role: 'SUPERVISOR' },
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
          skills: ['CLEANING'],
        },
        { email: 'klaus@domar.test', passwordHash, name: 'Klaus', role: 'OWNER' },
      ],
    });
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: 'klaus@domar.test' },
    });
    const property = await prisma.property.create({
      data: { name: 'Villa Borik', address: 'Borik 1, Zadar', ownerId: owner.id },
    });
    propertyId = property.id;

    for (const email of [
      'ana@domar.test',
      'marko@domar.test',
      'petra@domar.test',
      'klaus@domar.test',
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

  const createNegotiableJob = async () => {
    const res = await asUser('ana@domar.test')
      .post('/api/jobs')
      .send({
        propertyId,
        type: 'CLEANING',
        title: 'Negotiable turnover',
        scheduledStart: tomorrow(10),
        scheduledEnd: tomorrow(13),
        priceType: 'NEGOTIABLE',
        currency: 'EUR',
      })
      .expect(201);
    return res.body.id as string;
  };

  it('lists open negotiable jobs for a worker via open-for-bids', async () => {
    await createNegotiableJob();
    const res = await asUser('marko@domar.test')
      .get('/api/jobs/open-for-bids')
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].priceType).toBe('NEGOTIABLE');
    expect(res.body[0].myBid).toBeNull();
  });

  it('lets a worker submit then revise a single bid (upsert)', async () => {
    const jobId = await createNegotiableJob();

    const first = await asUser('marko@domar.test')
      .post(`/api/jobs/${jobId}/bids`)
      .send({ priceType: 'FIXED', amountCents: 9000, message: 'Can do it' })
      .expect(201);
    expect(first.body.amountCents).toBe(9000);

    const revised = await asUser('marko@domar.test')
      .post(`/api/jobs/${jobId}/bids`)
      .send({ priceType: 'HOURLY', amountCents: 2500 })
      .expect(201);
    expect(revised.body.priceType).toBe('HOURLY');
    expect(revised.body.amountCents).toBe(2500);

    // still exactly one bid for this worker
    const mine = await asUser('marko@domar.test')
      .get(`/api/jobs/${jobId}/bids`)
      .expect(200);
    expect(mine.body).toHaveLength(1);
  });

  it('keeps bids sealed: a worker sees only their own', async () => {
    const jobId = await createNegotiableJob();
    await asUser('marko@domar.test')
      .post(`/api/jobs/${jobId}/bids`)
      .send({ priceType: 'FIXED', amountCents: 8000 })
      .expect(201);
    await asUser('petra@domar.test')
      .post(`/api/jobs/${jobId}/bids`)
      .send({ priceType: 'FIXED', amountCents: 7000 })
      .expect(201);

    const markoView = await asUser('marko@domar.test')
      .get(`/api/jobs/${jobId}/bids`)
      .expect(200);
    expect(markoView.body).toHaveLength(1);
    expect(markoView.body[0].worker.name).toBe('Marko');

    const supervisorView = await asUser('ana@domar.test')
      .get(`/api/jobs/${jobId}/bids`)
      .expect(200);
    expect(supervisorView.body).toHaveLength(2);
  });

  it('accepts a bid: job assigned with the bid price, others rejected', async () => {
    const jobId = await createNegotiableJob();
    await asUser('marko@domar.test')
      .post(`/api/jobs/${jobId}/bids`)
      .send({ priceType: 'FIXED', amountCents: 8000 })
      .expect(201);
    const petraBid = await asUser('petra@domar.test')
      .post(`/api/jobs/${jobId}/bids`)
      .send({ priceType: 'HOURLY', amountCents: 2000 })
      .expect(201);

    const accepted = await asUser('ana@domar.test')
      .patch(`/api/jobs/${jobId}/bids/${petraBid.body.id}/accept`)
      .expect(200);
    expect(accepted.body.status).toBe('ASSIGNED');
    expect(accepted.body.assignedWorker.name).toBe('Petra');
    expect(accepted.body.priceType).toBe('HOURLY');
    expect(accepted.body.priceCents).toBe(2000);

    const allBids = await asUser('ana@domar.test')
      .get(`/api/jobs/${jobId}/bids`)
      .expect(200);
    const byWorker = Object.fromEntries(
      allBids.body.map((b: { worker: { name: string }; status: string }) => [
        b.worker.name,
        b.status,
      ]),
    );
    expect(byWorker.Petra).toBe('ACCEPTED');
    expect(byWorker.Marko).toBe('REJECTED');
  });

  it('lets a worker withdraw their own bid', async () => {
    const jobId = await createNegotiableJob();
    const bid = await asUser('marko@domar.test')
      .post(`/api/jobs/${jobId}/bids`)
      .send({ priceType: 'FIXED', amountCents: 8000 })
      .expect(201);
    await asUser('marko@domar.test')
      .delete(`/api/jobs/${jobId}/bids/${bid.body.id}`)
      .expect(200);
    const mine = await asUser('marko@domar.test')
      .get(`/api/jobs/${jobId}/bids`)
      .expect(200);
    expect(mine.body).toHaveLength(0);
  });

  it('rejects bidding on a non-open job and by non-workers', async () => {
    // A normal fixed-price job is not open for bids.
    const fixed = await asUser('ana@domar.test')
      .post('/api/jobs')
      .send({
        propertyId,
        type: 'CLEANING',
        title: 'Fixed job',
        scheduledStart: tomorrow(10),
        scheduledEnd: tomorrow(13),
        priceType: 'FIXED',
        priceCents: 5000,
      })
      .expect(201);
    await asUser('marko@domar.test')
      .post(`/api/jobs/${fixed.body.id}/bids`)
      .send({ priceType: 'FIXED', amountCents: 4000 })
      .expect(400);

    const jobId = await createNegotiableJob();
    await asUser('ana@domar.test')
      .post(`/api/jobs/${jobId}/bids`)
      .send({ priceType: 'FIXED', amountCents: 4000 })
      .expect(403);
  });
});
