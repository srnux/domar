"use client";

import { useTranslations } from "next-intl";
import { Gavel } from "lucide-react";
import { useAcceptBid, useJobBids } from "@/lib/bids";
import { formatMoney } from "@/lib/pricing";
import { Button, Card, EmptyState, Spinner } from "@/components/ui";

/** Supervisor's review of all bids on an open negotiable job. */
export function BidsPanel({
  jobId,
  currency,
}: {
  jobId: string;
  currency: string;
}) {
  const t = useTranslations("bids");
  const { data: bids, isPending } = useJobBids(jobId);
  const accept = useAcceptBid(jobId);

  return (
    <Card className="p-4">
      <h2 className="mb-2 flex items-center gap-1.5 font-semibold text-fg">
        <Gavel size={16} className="text-subtle" aria-hidden />
        {t("panelTitle")}
      </h2>

      {isPending && <Spinner />}
      {!isPending && (bids?.length ?? 0) === 0 && (
        <EmptyState title={t("noBids")} />
      )}

      {accept.isError && (
        <p role="alert" className="text-sm text-st-declined">
          {accept.error.message}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {(bids ?? []).map((bid) => {
          const amount = formatMoney(bid.amountCents, currency);
          return (
            <li
              key={bid.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-fg">
                  {bid.worker.name} ·{" "}
                  <span className="tabular-nums">
                    {bid.priceType === "HOURLY" ? `${amount}/hr` : amount}
                  </span>
                </p>
                {bid.message && (
                  <p className="mt-0.5 text-sm text-fg-soft">{bid.message}</p>
                )}
              </div>
              <Button
                variant="primary"
                onClick={() => accept.mutate(bid.id)}
                disabled={accept.isPending}
              >
                {t("accept")}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
