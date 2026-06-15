import type { JobDto, PriceType } from "@domar/shared";
import { useTranslations } from "next-intl";
import { Banknote, Gavel, Timer, type LucideIcon } from "lucide-react";

const ICONS: Record<PriceType, LucideIcon> = {
  FIXED: Banknote,
  HOURLY: Timer,
  NEGOTIABLE: Gavel,
};

/**
 * Compact chip showing a job's pricing model, sized to sit next to the
 * job-type chip. Renders nothing when the job has no price set.
 */
export function PriceTypeBadge({
  job,
  size = 14,
}: {
  job: Pick<JobDto, "priceType">;
  size?: number;
}) {
  const t = useTranslations("pricing");
  if (!job.priceType) return null;
  const Icon = ICONS[job.priceType];
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
      <Icon size={size} className="text-subtle" aria-hidden strokeWidth={2} />
      {t(`short.${job.priceType}`)}
    </span>
  );
}
