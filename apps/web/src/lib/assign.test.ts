import { describe, expect, it } from "vitest";
import type { JobDto, UserDto } from "@domar/shared";
import { findConflicts, workerMatchesJobType } from "./assign";

const worker = (skills: UserDto["skills"]): UserDto =>
  ({ id: "w1", skills }) as UserDto;

describe("workerMatchesJobType", () => {
  it("matches cleaning jobs to cleaning skill", () => {
    expect(workerMatchesJobType(worker(["CLEANING"]), "CLEANING")).toBe(true);
    expect(workerMatchesJobType(worker(["PLUMBING"]), "CLEANING")).toBe(false);
  });

  it("lets GENERAL workers take repairs", () => {
    expect(workerMatchesJobType(worker(["GENERAL"]), "REPAIR")).toBe(true);
    expect(workerMatchesJobType(worker(["REPAIR"]), "REPAIR")).toBe(true);
  });

  it("anyone can do inspections and OTHER jobs", () => {
    expect(workerMatchesJobType(worker(["CLEANING"]), "INSPECTION")).toBe(true);
    expect(workerMatchesJobType(worker([]), "OTHER")).toBe(true);
  });

  it("gardening jobs require the gardening skill", () => {
    expect(workerMatchesJobType(worker(["GARDENING"]), "GARDENING")).toBe(true);
    expect(workerMatchesJobType(worker(["GENERAL"]), "GARDENING")).toBe(false);
  });

  it("electrical and plumbing require the exact skill", () => {
    expect(workerMatchesJobType(worker(["GENERAL"]), "ELECTRICAL")).toBe(false);
    expect(workerMatchesJobType(worker(["ELECTRICAL"]), "ELECTRICAL")).toBe(true);
    expect(workerMatchesJobType(worker(["GENERAL"]), "PLUMBING")).toBe(false);
  });
});

describe("findConflicts", () => {
  const job = (
    id: string,
    workerId: string | null,
    start: string,
    end: string,
    status = "ASSIGNED",
  ): JobDto =>
    ({
      id,
      assignedWorker: workerId ? { id: workerId, name: "X" } : null,
      scheduledStart: start,
      scheduledEnd: end,
      status,
      title: id,
    }) as unknown as JobDto;

  const jobs = [
    job("a", "w1", "2026-07-04T08:00:00Z", "2026-07-04T11:00:00Z"),
    job("b", "w2", "2026-07-04T08:00:00Z", "2026-07-04T11:00:00Z"),
    job("c", "w1", "2026-07-04T12:00:00Z", "2026-07-04T14:00:00Z"),
    job("done", "w1", "2026-07-04T09:00:00Z", "2026-07-04T10:00:00Z", "VERIFIED"),
  ];

  it("finds an overlapping job for the same worker", () => {
    const conflicts = findConflicts(
      jobs,
      "w1",
      "2026-07-04T10:00:00Z",
      "2026-07-04T12:30:00Z",
    );
    expect(conflicts.map((j) => j.id).sort()).toEqual(["a", "c"]);
  });

  it("ignores other workers and non-overlapping windows", () => {
    expect(
      findConflicts(jobs, "w1", "2026-07-04T14:30:00Z", "2026-07-04T16:00:00Z"),
    ).toEqual([]);
  });

  it("touching boundaries do not conflict", () => {
    expect(
      findConflicts(jobs, "w1", "2026-07-04T11:00:00Z", "2026-07-04T12:00:00Z"),
    ).toEqual([]);
  });

  it("ignores finished and cancelled jobs", () => {
    const conflicts = findConflicts(
      jobs,
      "w1",
      "2026-07-04T09:00:00Z",
      "2026-07-04T09:30:00Z",
    );
    expect(conflicts.map((j) => j.id)).toEqual(["a"]);
  });

  it("excludes a given job id (editing an existing job)", () => {
    const conflicts = findConflicts(
      jobs,
      "w1",
      "2026-07-04T08:30:00Z",
      "2026-07-04T09:00:00Z",
      "a",
    );
    expect(conflicts).toEqual([]);
  });
});
