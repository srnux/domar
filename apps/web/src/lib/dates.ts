import { DISPLAY_TIMEZONE } from "@domar/shared";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const minutesFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
});

const headingFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const fullDateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const monthLabelFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  month: "long",
  year: "numeric",
});

const weekdayShortFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
});

/** "YYYY-MM-DD" of the instant in the display timezone (Europe/Zagreb). */
export function localDayKey(iso: string): string {
  return dayKeyFormat.format(new Date(iso));
}

/** Minutes after midnight of the instant in the display timezone (0–1439). */
export function zagrebMinutesOfDay(iso: string): number {
  const parts = minutesFormat.formatToParts(new Date(iso));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${timeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`;
}

/** "14:05" of the instant in the display timezone. */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** Readable heading for a "YYYY-MM-DD" day key, e.g. "Wed, 10 Jun". */
export function formatDayHeading(dayKey: string): string {
  return headingFormat.format(new Date(`${dayKey}T12:00:00Z`));
}

/** Full readable date for a "YYYY-MM-DD" day key, e.g. "Wednesday, 10 June 2026". */
export function formatFullDate(dayKey: string): string {
  return fullDateFormat.format(new Date(`${dayKey}T12:00:00Z`));
}

export function todayKey(): string {
  return dayKeyFormat.format(new Date());
}

/** Day key `days` from `key` (negative = past), in the display timezone. */
export function addDaysToKey(key: string, days: number): string {
  // Noon-UTC anchoring keeps each step on the same calendar day across DST.
  const base = Date.parse(`${key}T12:00:00Z`);
  return dayKeyFormat.format(new Date(base + days * 86_400_000));
}

/** Day key `days` from today (negative = past), in the display timezone. */
export function dayKeyPlus(days: number): string {
  return addDaysToKey(todayKey(), days);
}

/** "YYYY-MM-01" of the month containing `key`. */
export function startOfMonthKey(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

/** First-of-month key `months` away from `key` (handles year rollover). */
export function addMonthsToKey(key: string, months: number): string {
  const [year, month] = key.split("-").map(Number);
  const total = year * 12 + (month - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/** Weekday of `key` with Monday=0 … Sunday=6 (timezone-independent). */
export function weekdayMonIndex(key: string): number {
  return (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * Day keys covering the calendar month containing `anchorKey`, padded to whole
 * Monday-first weeks (4–6 rows of 7). First entry is a Monday.
 */
export function monthGridDays(anchorKey: string): string[] {
  const first = startOfMonthKey(anchorKey);
  const lastOfMonth = addDaysToKey(addMonthsToKey(first, 1), -1);
  const gridStart = addDaysToKey(first, -weekdayMonIndex(first));
  const gridEnd = addDaysToKey(lastOfMonth, 6 - weekdayMonIndex(lastOfMonth));

  const days: string[] = [];
  for (let key = gridStart; key <= gridEnd; key = addDaysToKey(key, 1)) {
    days.push(key);
  }
  return days;
}

/** Readable month + year for a day key, e.g. "June 2026". */
export function formatMonthLabel(key: string): string {
  return monthLabelFormat.format(new Date(`${key}T12:00:00Z`));
}

/** Short weekday labels, Monday-first: ["Mon", …, "Sun"]. */
export const WEEKDAY_SHORT: string[] = Array.from({ length: 7 }, (_, i) =>
  // 2024-01-01 is a Monday; add i days to walk the week.
  weekdayShortFormat.format(new Date(Date.UTC(2024, 0, 1 + i, 12))),
);

/** Groups items by their Zagreb-local day, keys sorted ascending. */
export function groupByLocalDay<T>(
  items: T[],
  getIso: (item: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of [...items].sort(
    (a, b) => Date.parse(getIso(a)) - Date.parse(getIso(b)),
  )) {
    const key = localDayKey(getIso(item));
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1)));
}
