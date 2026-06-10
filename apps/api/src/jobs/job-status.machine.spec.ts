import { JobStatus, Role } from '@prisma/client';
import {
  availableTransitions,
  canTransition,
  type TransitionContext,
} from './job-status.machine';

const supervisor: TransitionContext = {
  role: Role.SUPERVISOR,
  isAssignedWorker: false,
};
const assignedWorker: TransitionContext = {
  role: Role.WORKER,
  isAssignedWorker: true,
};
const otherWorker: TransitionContext = {
  role: Role.WORKER,
  isAssignedWorker: false,
};
const owner: TransitionContext = { role: Role.OWNER, isAssignedWorker: false };

const withReason = (ctx: TransitionContext): TransitionContext => ({
  ...ctx,
  reason: 'because',
});

describe('job status machine', () => {
  describe('happy path', () => {
    it.each([
      [JobStatus.DRAFT, JobStatus.ASSIGNED, supervisor],
      [JobStatus.ASSIGNED, JobStatus.ACCEPTED, assignedWorker],
      [JobStatus.ACCEPTED, JobStatus.IN_PROGRESS, assignedWorker],
      [JobStatus.IN_PROGRESS, JobStatus.DONE, assignedWorker],
      [JobStatus.DONE, JobStatus.VERIFIED, supervisor],
    ] as const)('%s → %s', (from, to, ctx) => {
      expect(canTransition(from, to, ctx)).toEqual({ ok: true });
    });

    it('worker declines an assignment with a reason', () => {
      expect(
        canTransition(
          JobStatus.ASSIGNED,
          JobStatus.DECLINED,
          withReason(assignedWorker),
        ),
      ).toEqual({ ok: true });
    });

    it('supervisor reassigns a declined job', () => {
      expect(
        canTransition(JobStatus.DECLINED, JobStatus.ASSIGNED, supervisor),
      ).toEqual({ ok: true });
    });

    it('supervisor reopens a done job with a reason', () => {
      expect(
        canTransition(
          JobStatus.DONE,
          JobStatus.ASSIGNED,
          withReason(supervisor),
        ),
      ).toEqual({ ok: true });
    });

    it.each([
      JobStatus.DRAFT,
      JobStatus.ASSIGNED,
      JobStatus.ACCEPTED,
      JobStatus.DECLINED,
      JobStatus.IN_PROGRESS,
    ] as const)('supervisor cancels a job in %s', (from) => {
      expect(canTransition(from, JobStatus.CANCELLED, supervisor)).toEqual({
        ok: true,
      });
    });
  });

  describe('required reasons', () => {
    it('decline without a reason is rejected', () => {
      const result = canTransition(
        JobStatus.ASSIGNED,
        JobStatus.DECLINED,
        assignedWorker,
      );
      expect(result.ok).toBe(false);
    });

    it('reopen without a reason is rejected', () => {
      const result = canTransition(
        JobStatus.DONE,
        JobStatus.ASSIGNED,
        supervisor,
      );
      expect(result.ok).toBe(false);
    });

    it('a blank reason does not count', () => {
      const result = canTransition(JobStatus.ASSIGNED, JobStatus.DECLINED, {
        ...assignedWorker,
        reason: '   ',
      });
      expect(result.ok).toBe(false);
    });
  });

  describe('role and assignment enforcement', () => {
    it('a worker not assigned to the job cannot accept it', () => {
      expect(
        canTransition(JobStatus.ASSIGNED, JobStatus.ACCEPTED, otherWorker).ok,
      ).toBe(false);
    });

    it('a worker not assigned to the job cannot start or finish it', () => {
      expect(
        canTransition(JobStatus.ACCEPTED, JobStatus.IN_PROGRESS, otherWorker)
          .ok,
      ).toBe(false);
      expect(
        canTransition(JobStatus.IN_PROGRESS, JobStatus.DONE, otherWorker).ok,
      ).toBe(false);
    });

    it('a supervisor cannot accept on behalf of a worker', () => {
      expect(
        canTransition(JobStatus.ASSIGNED, JobStatus.ACCEPTED, supervisor).ok,
      ).toBe(false);
    });

    it('a worker cannot verify their own work', () => {
      expect(
        canTransition(JobStatus.DONE, JobStatus.VERIFIED, assignedWorker).ok,
      ).toBe(false);
    });

    it('a worker cannot assign or cancel', () => {
      expect(
        canTransition(JobStatus.DRAFT, JobStatus.ASSIGNED, assignedWorker).ok,
      ).toBe(false);
      expect(
        canTransition(JobStatus.ASSIGNED, JobStatus.CANCELLED, assignedWorker)
          .ok,
      ).toBe(false);
    });

    it('an owner can do nothing at all', () => {
      const statuses = Object.values(JobStatus);
      for (const from of statuses) {
        for (const to of statuses) {
          expect(canTransition(from, to, withReason(owner)).ok).toBe(false);
        }
      }
    });
  });

  describe('illegal jumps', () => {
    it.each([
      [JobStatus.DRAFT, JobStatus.DONE],
      [JobStatus.DRAFT, JobStatus.VERIFIED],
      [JobStatus.DRAFT, JobStatus.IN_PROGRESS],
      [JobStatus.ASSIGNED, JobStatus.DONE],
      [JobStatus.ACCEPTED, JobStatus.DONE],
      [JobStatus.IN_PROGRESS, JobStatus.VERIFIED],
      [JobStatus.DONE, JobStatus.IN_PROGRESS],
    ] as const)('%s → %s is rejected for everyone', (from, to) => {
      expect(canTransition(from, to, withReason(supervisor)).ok).toBe(false);
      expect(canTransition(from, to, withReason(assignedWorker)).ok).toBe(
        false,
      );
    });

    it('same-state transitions are rejected', () => {
      for (const s of Object.values(JobStatus)) {
        expect(canTransition(s, s, withReason(supervisor)).ok).toBe(false);
      }
    });
  });

  describe('terminal and reserved states', () => {
    it.each([JobStatus.VERIFIED, JobStatus.CANCELLED] as const)(
      '%s has no exits',
      (from) => {
        for (const to of Object.values(JobStatus)) {
          expect(canTransition(from, to, withReason(supervisor)).ok).toBe(
            false,
          );
        }
      },
    );

    it('OPEN is inert in v1 (no exits, no entries)', () => {
      for (const other of Object.values(JobStatus)) {
        expect(
          canTransition(JobStatus.OPEN, other, withReason(supervisor)).ok,
        ).toBe(false);
        expect(
          canTransition(other, JobStatus.OPEN, withReason(supervisor)).ok,
        ).toBe(false);
      }
    });
  });

  describe('availableTransitions', () => {
    it('lists what the assigned worker can do with an assignment', () => {
      expect(
        availableTransitions(JobStatus.ASSIGNED, assignedWorker).sort(),
      ).toEqual([JobStatus.ACCEPTED, JobStatus.DECLINED].sort());
    });

    it('lists what the supervisor can do with a done job', () => {
      expect(
        availableTransitions(JobStatus.DONE, supervisor).sort(),
      ).toEqual([JobStatus.ASSIGNED, JobStatus.VERIFIED].sort());
    });

    it('is empty for an owner', () => {
      expect(availableTransitions(JobStatus.ASSIGNED, owner)).toEqual([]);
    });

    it('ignores reason availability — it reports reachable targets', () => {
      // reason is collected by the UI at action time; reachability should not
      // depend on it
      expect(
        availableTransitions(JobStatus.ASSIGNED, assignedWorker),
      ).toContain(JobStatus.DECLINED);
    });
  });
});
