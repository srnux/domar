import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Cross-tenant isolation — the single most important guarantee. Two companies,
 * each with a supervisor + property + job; neither may read or mutate the
 * other's data even with a valid id (the findUnique→findFirst conversions and
 * the Prisma tenant extension must hold).
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let aJobId: string;
  let bJobId: string;
  let aPropId: string;

  const jars = new Map<string, string>();
  const cookieOf = (email: string) => jars.get(email)!;

  const login = async (email: string) => {
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
  };

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
    await prisma.company.deleteMany();

    const passwordHash = await argon2.hash('Domar123!');

    const seedCompany = async (name: string, supervisorEmail: string) => {
      const company = await prisma.company.create({
        data: { name, maxSeats: 10 },
      });
      const supervisor = await prisma.user.create({
        data: {
          email: supervisorEmail,
          passwordHash,
          name: `${name} supervisor`,
          role: 'SUPERVISOR',
          companyId: company.id,
        },
      });
      await prisma.company.update({
        where: { id: company.id },
        data: { ownerUserId: supervisor.id },
      });
      const property = await prisma.property.create({
        data: { name: `${name} property`, address: '1 Main St', companyId: company.id },
      });
      const job = await prisma.job.create({
        data: {
          propertyId: property.id,
          companyId: company.id,
          type: 'CLEANING',
          title: `${name} job`,
          status: 'DRAFT',
          scheduledStart: new Date('2026-07-01T10:00:00Z'),
          scheduledEnd: new Date('2026-07-01T13:00:00Z'),
          createdById: supervisor.id,
        },
      });
      return { companyId: company.id, propertyId: property.id, jobId: job.id };
    };

    const a = await seedCompany('Alpha', 'alpha@domar.test');
    const b = await seedCompany('Beta', 'beta@domar.test');
    aJobId = a.jobId;
    bJobId = b.jobId;
    aPropId = a.propertyId;

    await login('alpha@domar.test');
    await login('beta@domar.test');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a supervisor sees only their own company jobs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/jobs')
      .set('Cookie', cookieOf('alpha@domar.test'))
      .expect(200);
    const titles = res.body.map((j: { title: string }) => j.title);
    expect(titles).toEqual(['Alpha job']);
    expect(titles).not.toContain('Beta job');
  });

  it('reads its own job by id', async () => {
    await request(app.getHttpServer())
      .get(`/api/jobs/${aJobId}`)
      .set('Cookie', cookieOf('alpha@domar.test'))
      .expect(200);
  });

  it('cannot read another company job by id (404)', async () => {
    await request(app.getHttpServer())
      .get(`/api/jobs/${bJobId}`)
      .set('Cookie', cookieOf('alpha@domar.test'))
      .expect(404);
  });

  it('cannot transition another company job by id (404)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/jobs/${bJobId}/transition`)
      .set('Cookie', cookieOf('alpha@domar.test'))
      .send({ to: 'CANCELLED', reason: 'x' })
      .expect(404);
  });

  it('cannot read another company property by id (404)', async () => {
    await request(app.getHttpServer())
      .get(`/api/properties/${aPropId}`)
      .set('Cookie', cookieOf('beta@domar.test'))
      .expect(404);
  });

  it('reciprocally, Beta sees only its own job', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/jobs')
      .set('Cookie', cookieOf('beta@domar.test'))
      .expect(200);
    expect(res.body.map((j: { title: string }) => j.title)).toEqual(['Beta job']);
  });
});
