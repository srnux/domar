export interface TurnoverSuggestion {
  start: Date;
  end: Date;
  /** Gap to the next check-in is shorter than the default cleaning slot. */
  tightGap: boolean;
}

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;
const MINIMUM_WINDOW_MS = 60 * 60 * 1000;

/** Proposes the cleaning window for the gap after a guest checks out. */
export function suggestTurnover(booking: {
  checkoutAt: Date;
  checkinAt: Date | null;
}): TurnoverSuggestion {
  const start = booking.checkoutAt;
  const preferredEnd = new Date(start.getTime() + DEFAULT_DURATION_MS);

  if (!booking.checkinAt || booking.checkinAt >= preferredEnd) {
    return { start, end: preferredEnd, tightGap: false };
  }

  // the next guest arrives before a full slot fits — clamp, but never
  // suggest a zero/negative window
  const end =
    booking.checkinAt.getTime() - start.getTime() >= MINIMUM_WINDOW_MS
      ? booking.checkinAt
      : new Date(start.getTime() + MINIMUM_WINDOW_MS);

  return { start, end, tightGap: true };
}
