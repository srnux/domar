"use client";

import type { JobDto } from "@domar/shared";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { priceLines } from "@/lib/pricing";
import { Card } from "@/components/ui";

/** Read-only price breakdown shown to the supervisor and the assigned worker. */
export function JobPriceCard({ job }: { job: JobDto }) {
  const t = useTranslations("pricing");
  const lines = priceLines(job);
  if (lines.length === 0) return null;

  return (
    <Card className="p-4">
      <h2 className="mb-2 flex items-center gap-1.5 font-semibold text-fg">
        <Wallet size={16} className="text-subtle" aria-hidden />
        {t("section")}
      </h2>
      <dl className="flex flex-col gap-1 text-sm">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between gap-4">
            <dt className="text-muted">{t(`line.${line.label}`)}</dt>
            <dd className="font-medium tabular-nums text-fg">{line.amount}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
