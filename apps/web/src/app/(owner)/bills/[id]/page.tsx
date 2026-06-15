"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { BillDto, BillLineItemDto } from "@domar/shared";
import { ArrowLeft, Download } from "lucide-react";
import { downloadBillPdf, useBill } from "@/lib/bills";
import { formatMoney } from "@/lib/pricing";
import { Button, Callout, Card, PageSpinner } from "@/components/ui";

export default function OwnerBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("bills");
  const router = useRouter();
  const { data: bill, isPending } = useBill(id);

  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    if (!bill) return;
    setError(null);
    setDownloading(true);
    try {
      await downloadBillPdf(bill);
    } catch {
      setError(t("downloadError"));
    } finally {
      setDownloading(false);
    }
  };

  if (isPending || !bill) {
    return (
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <PageSpinner />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <button
        onClick={() => router.push("/bills")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden /> {t("title")}
      </button>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {bill.number}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {bill.property.name}
            {bill.confirmedAt
              ? ` · ${t("issuedOn", {
                  date: new Date(bill.confirmedAt).toLocaleDateString("en-GB"),
                })}`
              : ""}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={download}
          loading={downloading}
        >
          <Download size={16} aria-hidden /> {t("downloadPdf")}
        </Button>
      </div>

      {error && (
        <Callout variant="declined" className="mb-4">
          {error}
        </Callout>
      )}

      <Card>
        <div className="divide-y divide-border">
          {bill.lineItems.map((li) => (
            <BillLineRow key={li.id} line={li} currency={bill.currency} />
          ))}
        </div>
        <Totals bill={bill} />
      </Card>

      {bill.notes && (
        <Card className="mt-4 p-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("notes")}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-fg-soft">
            {bill.notes}
          </p>
        </Card>
      )}
    </main>
  );
}

function BillLineRow({
  line,
  currency,
}: {
  line: BillLineItemDto;
  currency: string;
}) {
  const isHourly = line.kind === "JOB" && line.quantity !== 100;
  return (
    <div className="flex items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-fg">{line.label}</p>
        {isHourly && (
          <p className="text-xs text-muted">
            {line.quantity / 100} × {formatMoney(line.unitAmountCents, currency)}
          </p>
        )}
      </div>
      <span className="tabular-nums text-fg">
        {formatMoney(line.lineTotalCents, currency)}
      </span>
    </div>
  );
}

function Totals({ bill }: { bill: BillDto }) {
  const t = useTranslations("bills");
  const row = (label: string, amount: string, bold = false) => (
    <div
      className={`flex items-center justify-between px-4 py-2 text-sm ${
        bold ? "font-semibold text-fg" : "text-muted"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{amount}</span>
    </div>
  );
  return (
    <div className="border-t border-border pt-1">
      {row(t("net"), formatMoney(bill.netCents, bill.currency))}
      {bill.taxRateBps != null &&
        row(
          `${t("tax")} (${(bill.taxRateBps / 100).toFixed(2)}%)`,
          formatMoney(bill.taxCents, bill.currency),
        )}
      {row(t("gross"), formatMoney(bill.grossCents, bill.currency), true)}
    </div>
  );
}
