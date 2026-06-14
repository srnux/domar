import type { JobDto, JobType, Skill, UserDto } from "@domar/shared";

/** Which skills qualify for a job type; null = anyone can take it. */
const REQUIRED_SKILLS: Record<JobType, Skill[] | null> = {
  CLEANING: ["CLEANING"],
  REPAIR: ["REPAIR", "GENERAL"],
  ELECTRICAL: ["ELECTRICAL"],
  PLUMBING: ["PLUMBING"],
  GARDENING: ["GARDENING"],
  INSPECTION: null,
  OTHER: null,
};

export function workerMatchesJobType(
  worker: Pick<UserDto, "skills">,
  type: JobType,
): boolean {
  const required = REQUIRED_SKILLS[type];
  if (!required) return true;
  return worker.skills.some((s) => required.includes(s));
}

const OPEN_STATUSES = new Set([
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "DONE",
]);

/** Jobs of this worker overlapping [start, end) — a hint, not a blocker. */
export function findConflicts(
  jobs: JobDto[],
  workerId: string,
  start: string,
  end: string,
  excludeJobId?: string,
): JobDto[] {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  return jobs.filter(
    (j) =>
      j.id !== excludeJobId &&
      j.assignedWorker?.id === workerId &&
      OPEN_STATUSES.has(j.status) &&
      Date.parse(j.scheduledStart) < endMs &&
      Date.parse(j.scheduledEnd) > startMs,
  );
}
