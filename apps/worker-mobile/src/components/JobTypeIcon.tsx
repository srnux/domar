import type { JobType } from "@domar/shared";
import {
  ClipboardCheck,
  Droplets,
  Sparkles,
  Sprout,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<JobType, LucideIcon> = {
  CLEANING: Sparkles,
  REPAIR: Wrench,
  ELECTRICAL: Zap,
  PLUMBING: Droplets,
  GARDENING: Sprout,
  INSPECTION: ClipboardCheck,
  OTHER: Wrench,
};

export function JobTypeIcon({
  type,
  className,
  size = 16,
}: {
  type: JobType;
  className?: string;
  size?: number;
}) {
  const Icon = ICONS[type] ?? Wrench;
  return <Icon size={size} className={className} aria-hidden strokeWidth={2} />;
}
