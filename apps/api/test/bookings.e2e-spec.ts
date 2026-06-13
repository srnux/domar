import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Bookings (e2e)', () => {
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
    delete: (url: string) =>
      request(app.getHttpServer()).delete(url).set('Cookie', jars.get(email)!),
  });

  const hours = (n: number) =>
    new Date(Date.now() + n * 3600_000).toISOString();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.booking.deleteMany();
    await prisma.jobComment.deleteMany();
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
        },
      ],
    });
    const users = await prisma.user.findMany();
    markoId = users.find((u) => u.email === 'marko@domar.test')!.id;
    villaId = (
      await prisma.property.create({
        data: { name: 'Villa Borik', address: 'Borik 1, Zadar' },
      })
    ).id;

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

  it('supervisor creates a booking and gets a turnover suggestion back', async () => {
    const res = await asUser('ana@domar.test')
      .post('/api/bookings')
      .send({
        propertyId: villaId,
        checkoutAt: hours(24),
        checkinAt: hours(30),
        guestNote: 'Family of four',
      })
      .expect(201);

    expect(res.body.property.name).toBe('Villa Borik');
    expect(res.body.suggestion).not.toBeNull();
    expect(res.body.suggestion.tightGap).toBe(false);
    expect(res.body.turnoverJobId).toBeNull();
  });

  it('a tight same-day gap is flagged', async () => {
    const res = await asUser('ana@domar.test')
      .post('/api/bookings')
      .send({
        propertyId: villaId,
        checkoutAt: hours(48),
        checkinAt: hours(49),
      })
      .expect(201);
    expect(res.body.suggestion.tightGap).toBe(true);
  });

  it('rejects a check-in before checkout', async () => {
    await asUser('ana@domar.test')
      .post('/api/bookings')
      .send({
        propertyId: villaId,
        checkoutAt: hours(48),
        checkinAt: hours(40),
      })
      .expect(400);
  });

  it('linking a turnover job stops further suggestions', async () => {
    const booking = await asUser('ana@domar.test')
      .post('/api/bookings')
      .send({ propertyId: villaId, checkoutAt: hours(72) })
      .expect(201);

    const job = await asUser('ana@domar.test')
      .post('/api/jobs')
      .send({
        propertyId: villaId,
        type: 'CLEANING',
        title: 'Turnover',
        scheduledStart: hours(72),
        scheduledEnd: hours(75),
        assignedWorkerId: markoId,
      })
      .expect(201);

    const linked = await asUser('ana@domar.test')
      .patch(`/api/bookings/${booking.body.id}`)
      .send({ turnoverJobId: job.body.id })
      .expect(200);

    expect(linked.body.turnoverJobId).toBe(job.body.id);
    expect(linked.body.suggestion).toBeNull();
  });

  it('lists upcoming bookings ordered by checkout', async () => {
    const res = await asUser('ana@domar.test').get('/api/bookings').expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    const times = res.body.map((b: { checkoutAt: string }) => b.checkoutAt);
    expect([...times].sort()).toEqual(times);
  });

  it('deletes a booking', async () => {
    const res = await asUser('ana@domar.test')
      .post('/api/bookings')
      .send({ propertyId: villaId, checkoutAt: hours(96) })
      .expect(201);
    await asUser('ana@domar.test')
      .delete(`/api/bookings/${res.body.id}`)
      .expect(200);
  });

  it('workers cannot touch bookings', async () => {
    await asUser('marko@domar.test').get('/api/bookings').expect(403);
    await asUser('marko@domar.test')
      .post('/api/bookings')
      .send({ propertyId: villaId, checkoutAt: hours(24) })
      .expect(403);
  });
});
