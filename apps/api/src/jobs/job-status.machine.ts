import { JobStatus, Role } from '@prisma/client';

export interface TransitionContext {
  role: Role;
  /** Whether the acting user is the worker assigned to this job. */
  isAssignedWorker: boolean;
  reason?: string;
}

export type TransitionResult = { ok: true } | { ok: false; error: string };

interface TransitionRule {
  from: JobStatus;
  to: JobStatus;
  roles: Role[];
  /** WORKER rules apply only to the worker assigned to the job. */
  assignedOnly?: boolean;
  requiresReason?: boolean;
}

/**
 * The single source of truth for the job lifecycle:
 *
 *   draft → assigned → accepted → in_progress → done → verified
 *            ↑    ↓ declined (reason)            ↓ reopen (reason)
 *            └────┴──────────── supervisor ──────┘
 *
 * CANCELLED is reachable by the supervisor from every pre-done state.
 * OPEN holds a negotiable job in the bidding pool; the supervisor moves it to
 * ASSIGNED by accepting a bid.
 */
const RULES: TransitionRule[] = [
  { from: JobStatus.DRAFT, to: JobStatus.ASSIGNED, roles: [Role.SUPERVISOR] },
  { from: JobStatus.OPEN, to: JobStatus.ASSIGNED, roles: [Role.SUPERVISOR] },
  {
    from: JobStatus.ASSIGNED,
    to: JobStatus.ACCEPTED,
    roles: [Role.WORKER],
    assignedOnly: true,
  },
  {
    from: JobStatus.ASSIGNED,
    to: JobStatus.DECLINED,
    roles: [Role.WORKER],
    assignedOnly: true,
    requiresReason: true,
  },
  {
    from: JobStatus.DECLINED,
    to: JobStatus.ASSIGNED,
    roles: [Role.SUPERVISOR],
  },
  {
    from: JobStatus.ACCEPTED,
    to: JobStatus.IN_PROGRESS,
    roles: [Role.WORKER],
    assignedOnly: true,
  },
  {
    from: JobStatus.IN_PROGRESS,
    to: JobStatus.DONE,
    roles: [Role.WORKER],
    assignedOnly: true,
  },
  { from: JobStatus.DONE, to: JobStatus.VERIFIED, roles: [Role.SUPERVISOR] },
  {
    // reopen after review
    from: JobStatus.DONE,
    to: JobStatus.ASSIGNED,
    roles: [Role.SUPERVISOR],
    requiresReason: true,
  },
  ...[
    JobStatus.DRAFT,
    JobStatus.OPEN,
    JobStatus.ASSIGNED,
    JobStatus.ACCEPTED,
    JobStatus.DECLINED,
    JobStatus.IN_PROGRESS,
  ].map((from) => ({
    from,
    to: JobStatus.CANCELLED,
    roles: [Role.SUPERVISOR],
  })),
];

function findRule(
  from: JobStatus,
  to: JobStatus,
  ctx: TransitionContext,
): TransitionRule | undefined {
  return RULES.find(
    (r) =>
      r.from === from &&
      r.to === to &&
      r.roles.includes(ctx.role) &&
      (!r.assignedOnly || ctx.isAssignedWorker),
  );
}

export function canTransition(
  from: JobStatus,
  to: JobStatus,
  ctx: TransitionContext,
): TransitionResult {
  const rule = findRule(from, to, ctx);
  if (!rule) {
    return { ok: false, error: `Cannot move job from ${from} to ${to}` };
  }
  if (rule.requiresReason && !ctx.reason?.trim()) {
    return { ok: false, error: `A reason is required to move to ${to}` };
  }
  return { ok: true };
}

/** Reachable targets for this user, regardless of reason (UI collects it). */
export function availableTransitions(
  from: JobStatus,
  ctx: TransitionContext,
): JobStatus[] {
  return RULES.filter(
    (r) =>
      r.from === from &&
      r.roles.includes(ctx.role) &&
      (!r.assignedOnly || ctx.isAssignedWorker),
  ).map((r) => r.to);
}
