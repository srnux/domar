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

const headingFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "YYYY-MM-DD" of the instant in the display timezone (Europe/Zagreb). */
export function localDayKey(iso: string): string {
  return dayKeyFormat.format(new Date(iso));
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${timeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`;
}

/** Readable heading for a "YYYY-MM-DD" day key, e.g. "Wed, 10 Jun". */
export function formatDayHeading(dayKey: string): string {
  return headingFormat.format(new Date(`${dayKey}T12:00:00Z`));
}

export function todayKey(): string {
  return dayKeyFormat.format(new Date());
}

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
