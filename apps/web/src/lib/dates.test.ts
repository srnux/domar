import { describe, expect, it } from "vitest";
import {
  addMonthsToKey,
  formatDayHeading,
  formatTimeRange,
  localDayKey,
  monthGridDays,
  startOfMonthKey,
  weekdayMonIndex,
  zagrebMinutesOfDay,
} from "./dates";

// All helpers render in Europe/Zagreb (CET/CEST) regardless of host TZ.
describe("localDayKey", () => {
  it("uses the Zagreb-local date, not the UTC date", () => {
    // 23:30 UTC on Jun 9 is 01:30 on Jun 10 in Zagreb (CEST, UTC+2)
    expect(localDayKey("2026-06-09T23:30:00.000Z")).toBe("2026-06-10");
  });

  it("keeps a plain afternoon on its own day", () => {
    expect(localDayKey("2026-06-09T12:00:00.000Z")).toBe("2026-06-09");
  });

  it("handles winter time (UTC+1)", () => {
    // 23:30 UTC on Jan 5 is 00:30 on Jan 6 in Zagreb (CET, UTC+1)
    expect(localDayKey("2026-01-05T23:30:00.000Z")).toBe("2026-01-06");
  });
});

describe("formatTimeRange", () => {
  it("renders Zagreb-local hours", () => {
    expect(
      formatTimeRange("2026-06-10T08:00:00.000Z", "2026-06-10T11:00:00.000Z"),
    ).toBe("10:00 – 13:00");
  });
});

describe("zagrebMinutesOfDay", () => {
  it("converts a summer instant (CEST, UTC+2)", () => {
    // 07:30 UTC on Jun 10 is 09:30 in Zagreb
    expect(zagrebMinutesOfDay("2026-06-10T07:30:00.000Z")).toBe(9 * 60 + 30);
  });

  it("converts a winter instant (CET, UTC+1)", () => {
    // 13:15 UTC on Jan 5 is 14:15 in Zagreb
    expect(zagrebMinutesOfDay("2026-01-05T13:15:00.000Z")).toBe(14 * 60 + 15);
  });

  it("returns 0 at Zagreb midnight, not 1440", () => {
    // 22:00 UTC on Jun 9 is 00:00 on Jun 10 in Zagreb
    expect(zagrebMinutesOfDay("2026-06-09T22:00:00.000Z")).toBe(0);
  });
});

describe("formatDayHeading", () => {
  it("renders a readable weekday with date", () => {
    expect(formatDayHeading("2026-06-10")).toMatch(/Wed/);
    expect(formatDayHeading("2026-06-10")).toMatch(/10/);
  });
});

describe("startOfMonthKey", () => {
  it("returns the first of the containing month", () => {
    expect(startOfMonthKey("2026-06-13")).toBe("2026-06-01");
  });
});

describe("addMonthsToKey", () => {
  it("rolls forward across the year boundary", () => {
    expect(addMonthsToKey("2026-12-01", 1)).toBe("2027-01-01");
  });

  it("rolls backward across the year boundary", () => {
    expect(addMonthsToKey("2026-01-15", -1)).toBe("2025-12-01");
  });

  it("steps several months within a year", () => {
    expect(addMonthsToKey("2026-06-01", 3)).toBe("2026-09-01");
  });
});

describe("weekdayMonIndex", () => {
  it("maps Monday to 0 and Sunday to 6", () => {
    // 2026-06-08 is a Monday, 2026-06-14 a Sunday.
    expect(weekdayMonIndex("2026-06-08")).toBe(0);
    expect(weekdayMonIndex("2026-06-14")).toBe(6);
  });
});

describe("monthGridDays", () => {
  const grid = monthGridDays("2026-06-13");

  it("starts on a Monday and spans whole weeks", () => {
    expect(weekdayMonIndex(grid[0])).toBe(0);
    expect(grid.length % 7).toBe(0);
  });

  it("includes the first and last day of the month", () => {
    expect(grid).toContain("2026-06-01");
    expect(grid).toContain("2026-06-30");
  });

  it("pads to complete the final week", () => {
    // June 2026 starts on a Monday, so the grid begins on Jun 1 itself
    // and ends on Sun Jul 5 to complete the last week.
    expect(grid[0]).toBe("2026-06-01");
    expect(grid[grid.length - 1]).toBe("2026-07-05");
  });
});
