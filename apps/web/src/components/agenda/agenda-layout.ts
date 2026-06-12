import type { JobDto, Skill, UserDto } from "@domar/shared";
import { STATUS_VARIANT } from "@/components/StatusBadge";
import { localDayKey, zagrebMinutesOfDay } from "@/lib/dates";

/* Geometry from the design mockup (docs/domar-design-system). */
export const HOUR_W = 70;
export const GUTTER_W = 110;
export const ROW_H = 56;
export const MIN_BLOCK_W = 28;

const PX_PER_MIN = HOUR_W / 60;
const BLOCK_GAP = 4;
const DAY_MIN = 24 * 60;
/** The window never shrinks below the mockup's 08:00–18:00. */
const FLOOR_START_HOUR = 8;
const FLOOR_END_HOUR = 18;

export interface AgendaBlock {
  job: JobDto;
  leftPx: number;
  widthPx: number;
  zIndex: number;
  /** dom-agenda-job colour variant, same mapping as StatusBadge. */
  variant: string;
  /** scheduledEnd fell outside the rendered window (next Zagreb day). */
  clippedEnd: boolean;
}

export interface AgendaLane {
  /** Worker id, or "unassigned" for the trailing catch-all lane. */
  key: string;
  /** Worker name; null on the unassigned lane. */
  name: string | null;
  skills: Skill[];
  unassigned: boolean;
  blocks: AgendaBlock[];
}

export interface AgendaModel {
  lanes: AgendaLane[];
  startHour: number;
  endHour: number;
  /** Hour-label values, startHour..endHour inclusive. */
  hours: number[];
  jobCount: number;
  /** Lanes with a real worker — the unassigned lane doesn't count. */
  workerCount: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rounds away float noise (70/60 px per minute) while keeping sub-pixel detail. */
function px(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Lays out the given day's jobs as worker lanes of pixel-positioned blocks.
 * Returns null when the day has no jobs. CANCELLED jobs are dropped; every
 * other status stays visible — the timeline is the day's full picture,
 * including declined and already-verified work.
 */
export function buildAgendaModel(
  jobs: JobDto[],
  workers: UserDto[] | undefined,
  dayKey: string,
): AgendaModel | null {
  const todays = jobs
    .filter(
      (j) =>
        j.status !== "CANCELLED" && localDayKey(j.scheduledStart) === dayKey,
    )
    .sort((a, b) => Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart));
  if (todays.length === 0) return null;

  const startMin = (j: JobDto) => zagrebMinutesOfDay(j.scheduledStart);
  // An end on a later Zagreb day counts as end-of-day for window purposes.
  const endMin = (j: JobDto) =>
    localDayKey(j.scheduledEnd) === dayKey
      ? zagrebMinutesOfDay(j.scheduledEnd)
      : DAY_MIN;

  const earliest = Math.min(...todays.map(startMin));
  const latest = Math.max(...todays.map(endMin));
  const startHour = clamp(
    Math.min(FLOOR_START_HOUR, Math.floor(earliest / 60)),
    0,
    24,
  );
  const endHour = clamp(
    Math.max(FLOOR_END_HOUR, Math.ceil(latest / 60)),
    0,
    24,
  );
  const winStart = startHour * 60;
  const winEnd = endHour * 60;

  const skillsById = new Map((workers ?? []).map((w) => [w.id, w.skills]));

  const laneMap = new Map<string, AgendaLane>();
  for (const job of todays) {
    const worker = job.assignedWorker;
    const key = worker?.id ?? "unassigned";
    let lane = laneMap.get(key);
    if (!lane) {
      lane = {
        key,
        name: worker?.name ?? null,
        skills: worker ? (skillsById.get(worker.id) ?? []) : [],
        unassigned: !worker,
        blocks: [],
      };
      laneMap.set(key, lane);
    }
    const rawEnd = endMin(job);
    const endsLater = localDayKey(job.scheduledEnd) !== dayKey;
    const s = clamp(startMin(job), winStart, winEnd);
    const e = clamp(rawEnd, winStart, winEnd);
    lane.blocks.push({
      job,
      leftPx: px((s - winStart) * PX_PER_MIN),
      widthPx: px(Math.max(MIN_BLOCK_W, (e - s) * PX_PER_MIN - BLOCK_GAP)),
      // Later starts stack on top so every block's left edge stays visible.
      zIndex: lane.blocks.length + 1,
      variant: STATUS_VARIANT[job.status],
      clippedEnd: endsLater || rawEnd > winEnd,
    });
  }

  const lanes = [...laneMap.values()].sort((a, b) => {
    if (a.unassigned !== b.unassigned) return a.unassigned ? 1 : -1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  return {
    lanes,
    startHour,
    endHour,
    hours: Array.from(
      { length: endHour - startHour + 1 },
      (_, i) => startHour + i,
    ),
    jobCount: todays.length,
    workerCount: lanes.filter((l) => !l.unassigned).length,
  };
}

/** Pixel offset of the now line inside the lane body, or null when outside the window. */
export function nowLineLeftPx(
  nowMinutes: number,
  model: AgendaModel,
): number | null {
  const winStart = model.startHour * 60;
  const winEnd = model.endHour * 60;
  if (nowMinutes < winStart || nowMinutes > winEnd) return null;
  return px((nowMinutes - winStart) * PX_PER_MIN);
}

/* Avatar gradients ported from the mockup's .av-* rules. */
const AVATAR_GRADIENTS = [
  ["oklch(70% 0.13 35)", "oklch(55% 0.17 25)"],
  ["oklch(68% 0.13 250)", "oklch(50% 0.16 260)"],
  ["oklch(68% 0.13 165)", "oklch(50% 0.14 170)"],
  ["oklch(72% 0.10 290)", "oklch(56% 0.13 280)"],
  ["oklch(70% 0.12 80)", "oklch(55% 0.14 70)"],
  ["oklch(68% 0.12 220)", "oklch(52% 0.15 230)"],
] as const;

/** Deterministic CSS background for a worker avatar. */
export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const [from, to] = AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

/** "Marko Babić" → "MB" (at most two letters). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}
