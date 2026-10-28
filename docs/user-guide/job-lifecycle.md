# How a job moves through Domar

Every piece of work, whether a cleaning, a repair or an inspection, is a
**job**. A job always has one status, and only certain people can move it
to the next one. Domar shows you only the actions you're allowed to take
right now.

```mermaid
stateDiagram-v2
    [*] --> Draft: created without a worker
    [*] --> Assigned: created with a worker
    [*] --> OpenForBids: created as "Negotiable"
    Draft --> Assigned: supervisor assigns
    OpenForBids --> Assigned: supervisor accepts a bid
    Assigned --> Accepted: worker accepts
    Assigned --> Declined: worker declines (reason)
    Declined --> Assigned: supervisor reassigns
    Accepted --> InProgress: worker starts
    InProgress --> Done: worker finishes
    Done --> Verified: supervisor verifies
    Done --> Assigned: supervisor reopens (reason)
    Verified --> [*]
```

| Status | Meaning | Next step is up to |
|---|---|---|
| **Draft** | Planned, but nobody is assigned yet | Supervisor |
| **Open for bids** | Workers can propose a price | Supervisor: accept a bid |
| **Assigned** | A worker has been asked to do it | Worker: accept or decline |
| **Accepted** | The worker has confirmed | Worker: start |
| **Declined** | The worker can't do it, and gave a reason | Supervisor: reassign |
| **In progress** | The worker is on site | Worker: finish |
| **Done** | The worker has finished; waiting for review | Supervisor: verify or reopen |
| **Verified** | Reviewed and approved; can now be billed | (final) |
| **Cancelled** | Called off | (final) |

A few rules worth knowing:

- **Declining and reopening need a reason.** The reason is shown to the next
  person who handles the job.
- **A job can't be finished until its checklist is complete.** Every item must be
  ticked, and items marked *Photo required* need at least one photo.
- **Accepting a bid assigns the job** to that worker at the bid's price. All
  other bids are rejected. The worker still accepts the assignment as usual.
- **Supervisors can cancel** any job that isn't done yet.
- **Only drafts can be edited.** The price can still be changed while a job is
  *Draft* or *Assigned*. After that, a job is fixed.
- **Drafts, declined jobs and jobs open for bids need attention.** They appear in
  a highlighted block on the supervisor dashboard.
