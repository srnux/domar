import { ActivityType, JobStatus, PrismaClient, Role, Skill } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PASSWORD = 'Domar123!';

function at(dayOffset: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function atMin(dayOffset: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
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
  const ivan = await upsertUser('ivan@domar.test', 'Ivan Majstor', 'WORKER', ['REPAIR', 'PLUMBING', 'GARDENING']);
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
        // gardening — assigned to ivan (the gardener)
        {
          propertyId: borik.id, type: 'GARDENING', title: 'Trim hedges and mow lawn',
          status: JobStatus.ASSIGNED, assignedWorkerId: ivan.id,
          scheduledStart: at(2, 8), scheduledEnd: at(2, 11), createdById: ana.id,
        },
        // tomorrow — second job for marko (conflict-hint demo later)
        {
          propertyId: diklo.id, type: 'CLEANING', title: 'Turnover cleaning',
          status: JobStatus.ASSIGNED, assignedWorkerId: marko.id,
          scheduledStart: at(1, 11), scheduledEnd: at(1, 14), createdById: ana.id,
        },
        // open for bids — negotiable, no worker yet (cleaners marko/petra can bid)
        {
          propertyId: kolovare.id, type: 'CLEANING', title: 'Deep clean — open for bids',
          status: JobStatus.OPEN, priceType: 'NEGOTIABLE', currency: 'EUR',
          scheduledStart: at(3, 9), scheduledEnd: at(3, 13), createdById: ana.id,
        },
        // open for bids — repair (ivan can bid)
        {
          propertyId: borik.id, type: 'REPAIR', title: 'Fix garden fence — open for bids',
          status: JobStatus.OPEN, priceType: 'NEGOTIABLE', currency: 'EUR',
          scheduledStart: at(3, 14), scheduledEnd: at(3, 16), createdById: ana.id,
        },
      ],
    });
  }

  if ((await prisma.bid.count()) === 0) {
    const cleaningBidJob = await prisma.job.findFirst({
      where: { title: 'Deep clean — open for bids', status: JobStatus.OPEN },
    });
    if (cleaningBidJob) {
      await prisma.bid.createMany({
        data: [
          {
            jobId: cleaningBidJob.id, workerId: marko.id,
            priceType: 'FIXED', amountCents: 9000, message: 'Can do it Thursday morning.',
          },
          {
            jobId: cleaningBidJob.id, workerId: petra.id,
            priceType: 'HOURLY', amountCents: 2200, message: 'Available, ~3h.',
          },
        ],
      });
    }
  }

  if ((await prisma.activityEvent.count()) === 0) {
    const jobs = await prisma.job.findMany();
    const findJob = (propertyId: string, title: string, status: JobStatus) =>
      jobs.find(
        (j) =>
          j.propertyId === propertyId &&
          j.title === title &&
          j.status === status,
      );

    const draftTurnover = findJob(poluotok.id, 'Turnover cleaning', JobStatus.DRAFT);
    const borikTurnover = findJob(borik.id, 'Turnover cleaning — checkout 10h', JobStatus.ASSIGNED);
    const acRemote = findJob(diklo.id, 'AC remote not pairing', JobStatus.IN_PROGRESS);
    const declinedMixer = findJob(petrcane.id, 'Dripping shower mixer', JobStatus.DECLINED);
    const donePoluotok = findJob(poluotok.id, 'Turnover cleaning', JobStatus.DONE);
    const balconyRail = findJob(borik.id, 'Loose balcony rail', JobStatus.VERIFIED);
    const tomorrowDiklo = findJob(diklo.id, 'Turnover cleaning', JobStatus.ASSIGNED);

    const events = [
      acRemote && {
        jobId: acRemote.id, actorId: petra.id, type: ActivityType.STATUS_CHANGED,
        fromStatus: JobStatus.ACCEPTED, toStatus: JobStatus.IN_PROGRESS, createdAt: atMin(0, 13, 5),
      },
      declinedMixer && {
        jobId: declinedMixer.id, actorId: ivan.id, type: ActivityType.STATUS_CHANGED,
        fromStatus: JobStatus.ASSIGNED, toStatus: JobStatus.DECLINED,
        reason: 'On another job in Sukošan that day', createdAt: atMin(0, 11, 42),
      },
      borikTurnover && {
        jobId: borikTurnover.id, actorId: marko.id, type: ActivityType.STATUS_CHANGED,
        fromStatus: JobStatus.ASSIGNED, toStatus: JobStatus.ACCEPTED, createdAt: atMin(0, 8, 50),
      },
      donePoluotok && {
        jobId: donePoluotok.id, actorId: marko.id, type: ActivityType.STATUS_CHANGED,
        fromStatus: JobStatus.IN_PROGRESS, toStatus: JobStatus.DONE, createdAt: atMin(-1, 16, 40),
      },
      balconyRail && {
        jobId: balconyRail.id, actorId: ana.id, type: ActivityType.STATUS_CHANGED,
        fromStatus: JobStatus.DONE, toStatus: JobStatus.VERIFIED, createdAt: atMin(-2, 9, 15),
      },
      tomorrowDiklo && {
        jobId: tomorrowDiklo.id, actorId: ana.id, type: ActivityType.CREATED,
        toStatus: JobStatus.ASSIGNED, createdAt: atMin(-1, 8, 14),
      },
      draftTurnover && {
        jobId: draftTurnover.id, actorId: ana.id, type: ActivityType.CREATED,
        toStatus: JobStatus.DRAFT, createdAt: atMin(-1, 8, 2),
      },
    ].filter((e): e is NonNullable<typeof e> => Boolean(e));

    await prisma.activityEvent.createMany({ data: events });
  }

  if ((await prisma.jobRating.count()) === 0) {
    const jobs = await prisma.job.findMany();
    const findJob = (propertyId: string, title: string, status: JobStatus) =>
      jobs.find(
        (j) =>
          j.propertyId === propertyId &&
          j.title === title &&
          j.status === status,
      );

    // Owners rate the workers on their finished jobs.
    const balconyRail = findJob(borik.id, 'Loose balcony rail', JobStatus.VERIFIED); // ivan, owner klaus
    const petrcaneClean = findJob(petrcane.id, 'Turnover cleaning', JobStatus.VERIFIED); // marko, owner lena
    const donePoluotok = findJob(poluotok.id, 'Turnover cleaning', JobStatus.DONE); // marko, owner klaus

    const ratings = [
      balconyRail && {
        jobId: balconyRail.id, workerId: ivan.id, ratedById: klaus.id,
        score: 5, comment: 'Quick and tidy.',
      },
      petrcaneClean && {
        jobId: petrcaneClean.id, workerId: marko.id, ratedById: lena.id,
        score: 4, comment: 'Good turnover.',
      },
      donePoluotok && {
        jobId: donePoluotok.id, workerId: marko.id, ratedById: klaus.id,
        score: 5,
      },
    ].filter((r): r is NonNullable<typeof r> => Boolean(r));

    await prisma.jobRating.createMany({ data: ratings });
  }

  if ((await prisma.booking.count()) === 0) {
    await prisma.booking.createMany({
      data: [
        // perfect turnover gap tomorrow
        {
          propertyId: poluotok.id,
          checkoutAt: at(1, 10),
          checkinAt: at(1, 16),
          guestNote: 'Couple from Vienna, 5 nights',
        },
        // tight same-day gap
        {
          propertyId: borik.id,
          checkoutAt: at(2, 10),
          checkinAt: at(2, 12),
          guestNote: 'Back-to-back! Family of six arriving.',
        },
        // open-ended: no next guest yet
        {
          propertyId: kolovare.id,
          checkoutAt: at(4, 10),
        },
      ],
    });
  }

  console.log(`Seeded: 7 users (password: ${PASSWORD}), 5 properties, ${await prisma.job.count()} jobs, ${await prisma.bid.count()} bids, ${await prisma.booking.count()} bookings, ${await prisma.activityEvent.count()} activity events, ${await prisma.jobRating.count()} ratings`);
  console.log('Logins: ana@ (supervisor), marko@/ivan@/petra@ (workers), klaus@/lena@ (owners) — all @domar.test');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
