import type { ActivityType, JobStatus, JobType, Role } from '../enums';

export interface ActivityEventDto {
  id: string;
  type: ActivityType;
  fromStatus: JobStatus | null;
  toStatus: JobStatus | null;
  reason: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: Role } | null;
  job: {
    id: string;
    title: string;
    type: JobType;
    property: { id: string; name: string };
    assignedWorker: { id: string; name: string } | null;
  };
}
