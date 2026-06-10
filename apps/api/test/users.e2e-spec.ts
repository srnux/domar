import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let supervisorJar: string;
  let workerJar: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.job.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    const passwordHash = await argon2.hash('Domar123!');
    await prisma.user.createMany({
      data: [
        { email: 'ana@domar.test', passwordHash, name: 'Ana', role: 'SUPERVISOR' },
        { email: 'marko@domar.test', passwordHash, name: 'Marko', role: 'WORKER', skills: ['CLEANING'] },
        { email: 'inactive@domar.test', passwordHash, name: 'Gone', role: 'WORKER', isActive: false },
        { email: 'klaus@domar.test', passwordHash, name: 'Klaus', role: 'OWNER' },
      ],
    });

    const jarFor = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Domar123!' })
        .expect(200);
      return res
        .get('Set-Cookie')!
        .map((c: string) => c.split(';')[0])
        .filter((c: string) => !c.endsWith('='))
        .join('; ');
    };
    supervisorJar = await jarFor('ana@domar.test');
    workerJar = await jarFor('marko@domar.test');
  });

  afterAll(async () => {
    await app.close();
  });

  it('supervisor lists active workers (no password hashes)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users?role=WORKER')
      .set('Cookie', supervisorJar)
      .expect(200);

    expect(res.body.map((u: { name: string }) => u.name)).toEqual(['Marko']);
    expect(res.body[0].passwordHash).toBeUndefined();
  });

  it('supervisor lists owners', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users?role=OWNER')
      .set('Cookie', supervisorJar)
      .expect(200);
    expect(res.body.map((u: { name: string }) => u.name)).toEqual(['Klaus']);
  });

  it('non-supervisors get 403', async () => {
    await request(app.getHttpServer())
      .get('/api/users?role=WORKER')
      .set('Cookie', workerJar)
      .expect(403);
  });
});
