import { JobStatus, PrismaClient, Role, Skill } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PASSWORD = 'Domar123!';

function at(dayOffset: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  const passwordHash = await argon2.hash(PASSWORD);

  const upsertUser = (
    email: string,
    name: string,
    role: Role,
    skills: Skill[] = [],
    isActive = true,
  ) =>
    prisma.user.upsert({
      where: { email },
      update: { isActive },
      create: { email, passwordHash, name, role, skills, isActive },
    });

  const ana = await upsertUser('ana@domar.test', 'Ana Supervizor', 'SUPERVISOR');
  const marko = await upsertUser('marko@domar.test', 'Marko Radnik', 'WORKER', ['CLEANING']);
  const ivan = await upsertUser('ivan@domar.test', 'Ivan Majstor', 'WORKER', ['REPAIR', 'PLUMBING']);
  const petra = await upsertUser('petra@domar.test', 'Petra Struja', 'WORKER', ['CLEANING', 'ELECTRICAL']);
  await upsertUser('zoran@domar.test', 'Zoran Bivši', 'WORKER', ['CLEANING'], false);
  const klaus = await upsertUser('klaus@domar.test', 'Klaus Eigentümer', 'OWNER');
  const lena = await upsertUser('lena@domar.test', 'Lena Vlasnica', 'OWNER');

  const upsertProperty = async (
    name: string,
    address: string,
    ownerId: string,
    accessNotes: string,
    lat: number,
    lng: number,
  ) => {
    const existing = await prisma.property.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.property.create({
      data: { name, address, ownerId, accessNotes, lat, lng },
    });
  };

  const poluotok = await upsertProperty(
    'Apartment Poluotok',
    'Ulica Mihovila Pavlinovića 3, Zadar',
    klaus.id,
    'Key box at the entrance, code 4521. No parking — use Relja garage.',
    44.1153, 15.2247,
  );
  const borik = await upsertProperty(
    'Villa Borik',
    'Put Dikla 42, Zadar',
    klaus.id,
    'Gate remote in the mailbox. Pool tech comes Tuesdays.',
    44.1372, 15.2079,
  );
  const diklo = await upsertProperty(
    'Apartment Diklo',
    'Krešimirova obala 91, Zadar',
    klaus.id,
    'Owner key under the flowerpot (yes, really). Wifi: DikloGuest / suncezadar',
    44.1462, 15.1996,
  );
  const petrcane = await upsertProperty(
    'House Petrčane',
    'Obala Petra Krešimira IV 18, Petrčane',
    lena.id,
    'Smart lock — code sent per booking. Bins behind the house.',
    44.1779, 15.1664,
  );
  const kolovare = await upsertProperty(
    'Studio Kolovare',
    'Kolovare 12, Zadar',
    lena.id,
    'Reception holds the key (Hotel Kolovare desk).',
    44.1067, 15.2367,
  );

  const ensureTemplate = async (
    propertyId: string,
    items: Array<{ text: string; photoRequired?: boolean }>,
  ) => {
    const existing = await prisma.checklistTemplate.findUnique({
      where: { propertyId },
    });
    if (existing) return;
    await prisma.checklistTemplate.create({
      data: {
        propertyId,
        items: {
          create: items.map((item, i) => ({
            text: item.text,
            photoRequired: item.photoRequired ?? false,
            sortOrder: i,
          })),
        },
      },
    });
  };

  await ensureTemplate(poluotok.id, [
    { text: 'Strip and remake all beds' },
    { text: 'Vacuum and mop all floors' },
    { text: 'Clean bathroom incl. drain hair' },
    { text: 'Restock: 2x toilet paper, soap, dish tabs' },
    { text: 'After photo of bathroom', photoRequired: true },
    { text: 'After photo of kitchen', photoRequired: true },
  ]);
  await ensureTemplate(borik.id, [
    { text: 'Full turnover cleaning' },
    { text: 'Skim pool surface, check skimmer basket' },
    { text: 'Reset gate remote to mailbox' },
    { text: 'After photo of living room', photoRequired: true },
  ]);
  await ensureTemplate(petrcane.id, [
    { text: 'Turnover cleaning' },
    { text: 'Take bins out (behind the house)' },
    { text: 'Check smart lock battery' },
  ]);

  if ((await prisma.job.count()) === 0) {
    await prisma.job.createMany({
      data: [
        // needs attention
        {
          propertyId: poluotok.id, type: 'CLEANING', title: 'Turnover cleaning',
          status: JobStatus.DRAFT, scheduledStart: at(1, 10), scheduledEnd: at(1, 13),
          createdById: ana.id,
        },
        {
          propertyId: petrcane.id, type: 'PLUMBING', title: 'Dripping shower mixer',
          status: JobStatus.DECLINED, statusReason: 'On another job in Sukošan that day',
          assignedWorkerId: ivan.id,
          scheduledStart: at(2, 9), scheduledEnd: at(2, 11), createdById: ana.id,
        },
        // today
        {
          propertyId: borik.id, type: 'CLEANING', title: 'Turnover cleaning — checkout 10h',
          status: JobStatus.ASSIGNED, assignedWorkerId: marko.id,
          scheduledStart: at(0, 10), scheduledEnd: at(0, 14), createdById: ana.id,
        },
        {
          propertyId: kolovare.id, type: 'CLEANING', title: 'Deep clean before season',
          status: JobStatus.ACCEPTED, assignedWorkerId: petra.id,
          scheduledStart: at(0, 9), scheduledEnd: at(0, 12), createdById: ana.id,
        },
        {
          propertyId: diklo.id, type: 'ELECTRICAL', title: 'AC remote not pairing',
          status: JobStatus.IN_PROGRESS, assignedWorkerId: petra.id,
          scheduledStart: at(0, 15), scheduledEnd: at(0, 16), createdById: ana.id,
        },
        // done, waiting for verification
        {
          propertyId: poluotok.id, type: 'CLEANING', title: 'Turnover cleaning',
          status: JobStatus.DONE, assignedWorkerId: marko.id,
          workerNotes: 'All good. Grout in the shower is getting dark — schedule a re-seal?',
          scheduledStart: at(-1, 10), scheduledEnd: at(-1, 13), createdById: ana.id,
        },
        // history
        {
          propertyId: borik.id, type: 'REPAIR', title: 'Loose balcony rail',
          status: JobStatus.VERIFIED, assignedWorkerId: ivan.id,
          scheduledStart: at(-3, 9), scheduledEnd: at(-3, 10), createdById: ana.id,
        },
        {
          propertyId: petrcane.id, type: 'CLEANING', title: 'Turnover cleaning',
          status: JobStatus.VERIFIED, assignedWorkerId: marko.id,
          scheduledStart: at(-4, 10), scheduledEnd: at(-4, 13), createdById: ana.id,
        },
        {
          propertyId: kolovare.id, type: 'INSPECTION', title: 'Pre-season walkthrough',
          status: JobStatus.CANCELLED, statusReason: 'Owner did it herself',
          scheduledStart: at(-2, 11), scheduledEnd: at(-2, 12), createdById: ana.id,
        },
        // tomorrow — second job for marko (conflict-hint demo later)
        {
          propertyId: diklo.id, type: 'CLEANING', title: 'Turnover cleaning',
          status: JobStatus.ASSIGNED, assignedWorkerId: marko.id,
          scheduledStart: at(1, 11), scheduledEnd: at(1, 14), createdById: ana.id,
        },
      ],
    });
  }

  console.log(`Seeded: 7 users (password: ${PASSWORD}), 5 properties, ${await prisma.job.count()} jobs`);
  console.log('Logins: ana@ (supervisor), marko@/ivan@/petra@ (workers), klaus@/lena@ (owners) — all @domar.test');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
