import { Prisma } from '@prisma/client';
import type { BillDto, BillLineItemDto } from '@domar/shared';

export const billInclude = {
  property: { select: { id: true, name: true, address: true } },
  lineItems: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.BillInclude;

type BillWithRelations = Prisma.BillGetPayload<{ include: typeof billInclude }>;

/** Line total: unit amount scaled by quantity (held in hundredths). */
export function lineTotalCents(unitAmountCents: number, quantity: number): number {
  return Math.round((unitAmountCents * quantity) / 100);
}

export function toBillDto(bill: BillWithRelations): BillDto {
  const lineItems: BillLineItemDto[] = bill.lineItems.map((li) => ({
    id: li.id,
    kind: li.kind,
    jobId: li.jobId,
    label: li.label,
    quantity: li.quantity,
    unitAmountCents: li.unitAmountCents,
    lineTotalCents: lineTotalCents(li.unitAmountCents, li.quantity),
    sortOrder: li.sortOrder,
  }));

  const netCents = lineItems.reduce((sum, li) => sum + li.lineTotalCents, 0);
  const taxCents =
    bill.taxRateBps != null
      ? Math.round((netCents * bill.taxRateBps) / 10000)
      : 0;
  const grossCents = netCents + taxCents;

  return {
    id: bill.id,
    property: bill.property,
    status: bill.status,
    number: bill.number,
    currency: bill.currency,
    taxRateBps: bill.taxRateBps,
    notes: bill.notes,
    lineItems,
    netCents,
    taxCents,
    grossCents,
    confirmedAt: bill.confirmedAt ? bill.confirmedAt.toISOString() : null,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
  };
}
