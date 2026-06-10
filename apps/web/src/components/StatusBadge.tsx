import type { JobStatus } from "@domar/shared";
import { useTranslations } from "next-intl";

const STATUS_STYLES: Record<JobStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  OPEN: "bg-neutral-100 text-neutral-600",
  ASSIGNED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-sky-100 text-sky-700",
  DECLINED: "bg-orange-100 text-orange-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  DONE: "bg-violet-100 text-violet-700",
  VERIFIED: "bg-green-100 text-green-700",
  CANCELLED: "bg-neutral-200 text-neutral-500 line-through",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const t = useTranslations("status");
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {t(status)}
    </span>
  );
}
