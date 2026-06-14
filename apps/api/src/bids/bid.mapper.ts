import { Prisma } from '@prisma/client';

/** A bid always carries its worker's identity for the supervisor's view. */
export const bidInclude = {
  worker: { select: { id: true, name: true } },
} satisfies Prisma.BidInclude;

type BidWithWorker = Prisma.BidGetPayload<{ include: typeof bidInclude }>;

export function toBidDto(bid: BidWithWorker) {
  return {
    id: bid.id,
    jobId: bid.jobId,
    worker: bid.worker,
    priceType: bid.priceType,
    amountCents: bid.amountCents,
    message: bid.message,
    status: bid.status,
    createdAt: bid.createdAt,
  };
}
