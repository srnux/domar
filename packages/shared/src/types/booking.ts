export interface BookingDto {
  id: string;
  propertyId: string;
  property: { id: string; name: string };
  checkoutAt: string;
  checkinAt: string | null;
  guestNote: string | null;
  turnoverJobId: string | null;
  /** Proposed cleaning window; null once a job is linked or checkout passed. */
  suggestion: {
    start: string;
    end: string;
    tightGap: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  propertyId: string;
  checkoutAt: string;
  checkinAt?: string;
  guestNote?: string;
}

export type UpdateBookingPayload = Partial<CreateBookingPayload> & {
  turnoverJobId?: string;
};
