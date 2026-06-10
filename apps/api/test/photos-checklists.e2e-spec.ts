import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('fake jpeg body'),
]);

describe('Photos & Checklists (e2e)', () => {
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
    put: (url: string) =>
      request(app.getHttpServer()).put(url).set('Cookie', jars.get(email)!),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    prisma = app.get(PrismaService);
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
        { email: 'marko@domar.test', passwordHash, name: 'Marko', role: 'WORKER', skills: ['CLEANING'] },
        { email: 'petra@domar.test', passwordHash, name: 'Petra', role: 'WORKER', skills: ['CLEANING'] },
        { email: 'klaus@domar.test', passwordHash, name: 'Klaus', role: 'OWNER' },
        { email: 'lena@domar.test', passwordHash, name: 'Lena', role: 'OWNER' },
      ],
    });
    const users = await prisma.user.findMany();
    const idOf = (email: string) => users.find((u) => u.email === email)!.id;
    markoId = idOf('marko@domar.test');

    const villa = await prisma.property.create({
      data: {
        name: 'Villa Borik',
        address: 'Borik 1, Zadar',
        ownerId: idOf('klaus@domar.test'),
        checklistTemplate: {
          create: {
            items: {
              create: [
                { text: 'Vacuum all rooms', sortOrder: 0 },
                { text: 'After photo of bathroom', photoRequired: true, sortOrder: 1 },
              ],
            },
          },
        },
      },
    });
    villaId = villa.id;

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

  async function createAssignedCleaningJob(): Promise<{
    id: string;
    checklistItems: Array<{
      id: string;
      text: string;
      photoRequired: boolean;
      done: boolean;
    }>;
  }> {
    const res = await asUser('ana@domar.test')
      .post('/api/jobs')
      .send({
        propertyId: villaId,
        type: 'CLEANING',
        title: 'Turnover with checklist',
        scheduledStart: hours(1),
        scheduledEnd: hours(4),
        assignedWorkerId: markoId,
      })
      .expect(201);
    return res.body;
  }

  describe('checklist snapshot', () => {
    it('copies the property template onto a new cleaning job', async () => {
      const job = await createAssignedCleaningJob();

      expect(job.checklistItems).toHaveLength(2);
      expect(job.checklistItems[0].text).toBe('Vacuum all rooms');
      expect(job.checklistItems[1].photoRequired).toBe(true);
      expect(job.checklistItems.every((i) => !i.done)).toBe(true);
    });

    it('later template edits do not touch existing jobs', async () => {
      const job = await createAssignedCleaningJob();

      await asUser('ana@domar.test')
        .put(`/api/properties/${villaId}/checklist-template`)
        .send({ items: [{ text: 'Completely different list' }] })
        .expect(200);

      const after = await asUser('ana@domar.test')
        .get(`/api/jobs/${job.id}`)
        .expect(200);
      expect(after.body.checklistItems.map((i: { text: string }) => i.text)).toEqual([
        'Vacuum all rooms',
        'After photo of bathroom',
      ]);

      // restore the template for the rest of the suite
      await asUser('ana@domar.test')
        .put(`/api/properties/${villaId}/checklist-template`)
        .send({
          items: [
            { text: 'Vacuum all rooms' },
            { text: 'After photo of bathroom', photoRequired: true },
          ],
        })
        .expect(200);
    });

    it('non-cleaning jobs get no checklist', async () => {
      const res = await asUser('ana@domar.test')
        .post('/api/jobs')
        .send({
          propertyId: villaId,
          type: 'REPAIR',
          title: 'Fix hinge',
          scheduledStart: hours(1),
          scheduledEnd: hours(2),
          assignedWorkerId: markoId,
        })
        .expect(201);
      expect(res.body.checklistItems).toEqual([]);
    });
  });

  describe('checking off items', () => {
    it('the assigned worker can toggle an item', async () => {
      const job = await createAssignedCleaningJob();
      const item = job.checklistItems[0];

      const res = await asUser('marko@domar.test')
        .patch(`/api/checklist-items/${item.id}`)
        .send({ done: true })
        .expect(200);
      expect(res.body.done).toBe(true);
    });

    it('an unassigned worker cannot', async () => {
      const job = await createAssignedCleaningJob();
      await asUser('petra@domar.test')
        .patch(`/api/checklist-items/${job.checklistItems[0].id}`)
        .send({ done: true })
        .expect(404);
    });

    it('owners cannot', async () => {
      const job = await createAssignedCleaningJob();
      await asUser('klaus@domar.test')
        .patch(`/api/checklist-items/${job.checklistItems[0].id}`)
        .send({ done: true })
        .expect(404);
    });
  });

  describe('photo upload', () => {
    it('assigned worker uploads a BEFORE photo', async () => {
      const job = await createAssignedCleaningJob();

      const res = await asUser('marko@domar.test')
        .post(`/api/jobs/${job.id}/photos`)
        .field('kind', 'BEFORE')
        .attach('file', JPEG, 'photo.jpg')
        .expect(201);

      expect(res.body.kind).toBe('BEFORE');
      expect(res.body.id).toBeTruthy();
    });

    it('rejects a file that is not really an image', async () => {
      const job = await createAssignedCleaningJob();

      await asUser('marko@domar.test')
        .post(`/api/jobs/${job.id}/photos`)
        .field('kind', 'BEFORE')
        .attach('file', Buffer.from('<html>not an image</html>'), 'evil.jpg')
        .expect(400);
    });

    it('an unassigned worker cannot upload', async () => {
      const job = await createAssignedCleaningJob();

      await asUser('petra@domar.test')
        .post(`/api/jobs/${job.id}/photos`)
        .field('kind', 'BEFORE')
        .attach('file', JPEG, 'photo.jpg')
        .expect(404);
    });
  });

  describe('finish-guard', () => {
    it('blocks DONE while items are unchecked or photo-required items lack photos', async () => {
      const job = await createAssignedCleaningJob();
      const [plain, photoItem] = job.checklistItems;

      const move = (body: Record<string, unknown>, expected: number) =>
        asUser('marko@domar.test')
          .patch(`/api/jobs/${job.id}/transition`)
          .send(body)
          .expect(expected);

      await move({ to: 'ACCEPTED' }, 200);
      await move({ to: 'IN_PROGRESS' }, 200);

      // nothing done yet
      await move({ to: 'DONE' }, 409);

      // check both items, but photo-required item still has no photo
      await asUser('marko@domar.test')
        .patch(`/api/checklist-items/${plain.id}`)
        .send({ done: true })
        .expect(200);
      await asUser('marko@domar.test')
        .patch(`/api/checklist-items/${photoItem.id}`)
        .send({ done: true })
        .expect(200);
      await move({ to: 'DONE' }, 409);

      // upload the required photo linked to the item
      await asUser('marko@domar.test')
        .post(`/api/jobs/${job.id}/photos`)
        .field('kind', 'AFTER')
        .field('checklistItemId', photoItem.id)
        .attach('file', JPEG, 'after.jpg')
        .expect(201);

      await move({ to: 'DONE' }, 200);
    });
  });

  describe('photo access control', () => {
    let photoId: string;

    beforeAll(async () => {
      const job = await createAssignedCleaningJob();
      const res = await asUser('marko@domar.test')
        .post(`/api/jobs/${job.id}/photos`)
        .field('kind', 'BEFORE')
        .attach('file', JPEG, 'photo.jpg')
        .expect(201);
      photoId = res.body.id;
    });

    it('streams to the supervisor with private caching', async () => {
      const res = await asUser('ana@domar.test')
        .get(`/api/photos/${photoId}`)
        .expect(200);
      expect(res.headers['content-type']).toBe('image/jpeg');
      expect(res.headers['cache-control']).toContain('private');
    });

    it('streams to the uploader and the property owner', async () => {
      await asUser('marko@domar.test').get(`/api/photos/${photoId}`).expect(200);
      await asUser('klaus@domar.test').get(`/api/photos/${photoId}`).expect(200);
    });

    it('hides it from other owners and unassigned workers', async () => {
      await asUser('lena@domar.test').get(`/api/photos/${photoId}`).expect(404);
      await asUser('petra@domar.test').get(`/api/photos/${photoId}`).expect(404);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/photos/${photoId}`)
        .expect(401);
    });
  });
});
