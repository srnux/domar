import type { BillLineItemKind, BillStatus } from '../enums';

export interface BillLineItemDto {
  id: string;
  kind: BillLineItemKind;
  /** Set when kind is JOB. */
  jobId: string | null;
  label: string;
  /** Quantity in hundredths (100 = 1.00 unit / 1 hr). */
  quantity: number;
  /** Net unit amount in minor units (cents). */
  unitAmountCents: number;
  /** Computed: round(unitAmountCents * quantity / 100). */
  lineTotalCents: number;
  sortOrder: number;
}

export interface BillPropertyDto {
  id: string;
  name: string;
  address: string;
}

export interface BillDto {
  id: string;
  property: BillPropertyDto;
  status: BillStatus;
  /** Assigned at confirm time, e.g. INV-2026-0007. null while DRAFT. */
  number: string | null;
  currency: string;
  /** VAT rate in basis points (1900 = 19%). null = no tax line. */
  taxRateBps: number | null;
  notes: string | null;
  lineItems: BillLineItemDto[];
  /** Computed sum of line totals, minor units. */
  netCents: number;
  /** Computed tax, minor units (0 when no taxRateBps). */
  taxCents: number;
  /** Computed net + tax, minor units. */
  grossCents: number;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillPayload {
  propertyId: string;
  currency?: string;
  taxRateBps?: number;
  notes?: string;
}

export interface UpdateBillPayload {
  currency?: string;
  /** Pass null to clear the VAT rate. */
  taxRateBps?: number | null;
  notes?: string;
}

export interface AddJobLinesPayload {
  jobIds: string[];
}

export interface AddLineItemPayload {
  label: string;
  unitAmountCents: number;
  /** Hundredths; defaults to 100 (one unit). */
  quantity?: number;
}

export interface UpdateLineItemPayload {
  label?: string;
  unitAmountCents?: number;
  quantity?: number;
}
