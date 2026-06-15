import type { JobStatus } from "@domar/shared";
import { useTranslations } from "next-intl";

/**
 * Single source of job-status colour. Maps each status to a `dom-pill`
 * variant (see globals.css). Statuses stay distinguishable at a glance in a
 * long list, outdoors, on a phone — colour + a leading dot, never colour alone.
 */
export const STATUS_VARIANT: Record<JobStatus, string> = {
  DRAFT: "draft",
  OPEN: "draft",
  ASSIGNED: "assigned",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  IN_PROGRESS: "progress",
  DONE: "done",
  VERIFIED: "verified",
  CANCELLED: "cancelled",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const t = useTranslations("status");
  return (
    <span className={`dom-pill ${STATUS_VARIANT[status]}`}>
      <span className="dom-pdot" aria-hidden />
      {t(status)}
    </span>
  );
}
