import type { JobDto, JobStatus, UserDto } from "@domar/shared";
import { describe, expect, it } from "vitest";
import {
  HOUR_W,
  MIN_BLOCK_W,
  buildAgendaModel,
  initials,
  nowLineLeftPx,
} from "./agenda-layout";

// June 2026: Zagreb is CEST (UTC+2). All fixtures are on local Jun 10.
const DAY = "2026-06-10";

function job(overrides: {
  id: string;
  /** Zagreb-local "HH:MM" on DAY. */
  start: string;
  end: string;
  endsNextDay?: boolean;
  status?: JobStatus;
  worker?: { id: string; name: string } | null;
}): JobDto {
  const toIso = (local: string, nextDay = false) => {
    const [h, m] = local.split(":").map(Number);
    const utc = Date.UTC(2026, 5, nextDay ? 11 : 10, h! - 2, m);
    return new Date(utc).toISOString();
  };
  return {
    id: overrides.id,
    property: {
      id: "prop-1",
      name: "Poluotok 12",
      address: "Ulica 1",
      lat: null,
      lng: null,
      accessNotes: null,
    },
    type: "CLEANING",
    title: "Turnover",
    description: null,
    status: overrides.status ?? "ACCEPTED",
    priority: "NORMAL",
    scheduledStart: toIso(overrides.start),
    scheduledEnd: toIso(overrides.end, overrides.endsNextDay),
    assignedWorker:
      overrides.worker === undefined
        ? { id: "w-marko", name: "Marko Babić" }
        : overrides.worker,
    statusReason: null,
    workerNotes: null,
    priceType: null,
    priceCents: null,
    currency: "EUR",
    estimatedHours: null,
    spentHours: null,
    bidCount: 0,
    allowedTransitions: [],
    checklistItems: [],
    photos: [],
    rating: null,
    createdAt: toIso("07:00"),
    updatedAt: toIso("07:00"),
  };
}

const workers: UserDto[] = [
  {
    id: "w-marko",
    email: "marko@example.com",
    name: "Marko Babić",
    phone: null,
    role: "WORKER",
    skills: ["CLEANING"],
    locale: "en",
    isActive: true,
    avatarFilename: null,
    companyId: "c-1",
    isPlatformAdmin: false,
    avgScore: null,
    ratingCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("buildAgendaModel", () => {
  it("positions a 09:00–11:00 job in the default 08–18 window", () => {
    const model = buildAgendaModel(
      [job({ id: "a", start: "09:00", end: "11:00" })],
      workers,
      DAY,
    );
    expect(model).not.toBeNull();
    expect(model!.startHour).toBe(8);
    expect(model!.endHour).toBe(18);
    expect(model!.hours).toHaveLength(11);
    const block = model!.lanes[0]!.blocks[0]!;
    expect(block.leftPx).toBe(HOUR_W);
    expect(block.widthPx).toBe(HOUR_W * 2 - 4);
    expect(block.clippedEnd).toBe(false);
  });

  it("expands the window to cover early and late jobs, never past 0/24", () => {
    const model = buildAgendaModel(
      [
        job({ id: "a", start: "06:30", end: "07:30" }),
        job({ id: "b", start: "19:00", end: "19:30" }),
      ],
      workers,
      DAY,
    )!;
    expect(model.startHour).toBe(6);
    expect(model.endHour).toBe(20);

    const allDay = buildAgendaModel(
      [job({ id: "c", start: "00:00", end: "23:45" })],
      workers,
      DAY,
    )!;
    expect(allDay.startHour).toBe(0);
    expect(allDay.endHour).toBe(24);
  });

  it("clamps a job ending on the next day and flags clippedEnd", () => {
    const model = buildAgendaModel(
      [job({ id: "a", start: "17:00", end: "01:00", endsNextDay: true })],
      workers,
      DAY,
    )!;
    expect(model.endHour).toBe(24);
    const block = model.lanes[0]!.blocks[0]!;
    expect(block.clippedEnd).toBe(true);
    // 17:00 → 24:00 within an 08–24 window
    expect(block.leftPx).toBe(HOUR_W * 9);
    expect(block.widthPx).toBe(HOUR_W * 7 - 4);
  });

  it("puts unassigned jobs in a trailing lane excluded from workerCount", () => {
    const model = buildAgendaModel(
      [
        job({ id: "a", start: "09:00", end: "10:00", worker: null, status: "DRAFT" }),
        job({ id: "b", start: "10:00", end: "11:00" }),
      ],
      workers,
      DAY,
    )!;
    expect(model.lanes).toHaveLength(2);
    expect(model.lanes[1]!.unassigned).toBe(true);
    expect(model.lanes[1]!.name).toBeNull();
    expect(model.workerCount).toBe(1);
    expect(model.jobCount).toBe(2);
  });

  it("excludes cancelled and other-day jobs; returns null on an empty day", () => {
    const model = buildAgendaModel(
      [
        job({ id: "a", start: "09:00", end: "10:00", status: "CANCELLED" }),
        job({ id: "b", start: "09:00", end: "10:00" }),
      ],
      workers,
      "2026-06-11",
    );
    expect(model).toBeNull();

    const sameDay = buildAgendaModel(
      [
        job({ id: "a", start: "09:00", end: "10:00", status: "CANCELLED" }),
        job({ id: "b", start: "09:00", end: "10:00" }),
      ],
      workers,
      DAY,
    )!;
    expect(sameDay.jobCount).toBe(1);
  });

  it("stacks overlapping jobs with increasing z-index and enforces a min width", () => {
    const model = buildAgendaModel(
      [
        job({ id: "a", start: "09:00", end: "11:00" }),
        job({ id: "b", start: "10:00", end: "12:00" }),
        job({ id: "c", start: "13:00", end: "13:10" }),
      ],
      workers,
      DAY,
    )!;
    const blocks = model.lanes[0]!.blocks;
    expect(blocks.map((b) => b.zIndex)).toEqual([1, 2, 3]);
    expect(blocks[2]!.widthPx).toBe(MIN_BLOCK_W);
  });

  it("maps statuses to dom-pill variants and joins worker skills", () => {
    const model = buildAgendaModel(
      [job({ id: "a", start: "09:00", end: "10:00", status: "IN_PROGRESS" })],
      workers,
      DAY,
    )!;
    expect(model.lanes[0]!.blocks[0]!.variant).toBe("progress");
    expect(model.lanes[0]!.skills).toEqual(["CLEANING"]);
  });

  it("renders lanes even when the workers query has not resolved", () => {
    const model = buildAgendaModel(
      [job({ id: "a", start: "09:00", end: "10:00" })],
      undefined,
      DAY,
    )!;
    expect(model.lanes[0]!.name).toBe("Marko Babić");
    expect(model.lanes[0]!.skills).toEqual([]);
  });
});

describe("nowLineLeftPx", () => {
  const model = buildAgendaModel(
    [job({ id: "a", start: "09:00", end: "11:00" })],
    workers,
    DAY,
  )!;

  it("positions the line inside the window", () => {
    expect(nowLineLeftPx(9 * 60, model)).toBe(HOUR_W);
  });

  it("returns null outside the window", () => {
    expect(nowLineLeftPx(7 * 60, model)).toBeNull();
    expect(nowLineLeftPx(19 * 60, model)).toBeNull();
  });
});

describe("initials", () => {
  it("takes the first letter of up to two words", () => {
    expect(initials("Marko Babić")).toBe("MB");
    expect(initials("Ana")).toBe("A");
    expect(initials("Ana Maria Horvat")).toBe("AM");
  });
});
