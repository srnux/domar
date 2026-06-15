"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, ReceiptText } from "lucide-react";
import { BillStatusBadge } from "@/components/BillStatusBadge";
import { useBills } from "@/lib/bills";
import { formatMoney } from "@/lib/pricing";
import {
  buttonClass,
  Card,
  EmptyState,
  PageHeader,
  PageSpinner,
} from "@/components/ui";

export default function SupervisorBillsPage() {
  const t = useTranslations("bills");
  const { data: bills, isPending } = useBills();

  return (
    <main className="mx-auto max-w-6xl p-4">
      <PageHeader
        title={t("title")}
        action={
          <Link href="/manage/bills/new" className={buttonClass({ variant: "primary" })}>
            <Plus size={16} aria-hidden /> {t("newBill")}
          </Link>
        }
      />

      {isPending && <PageSpinner />}

      {!isPending && (bills ?? []).length === 0 && (
        <EmptyState
          icon={<ReceiptText size={22} aria-hidden />}
          title={t("noBills")}
        />
      )}

      <div className="flex flex-col gap-3">
        {(bills ?? []).map((bill) => (
          <Link key={bill.id} href={`/manage/bills/${bill.id}`} className="block">
            <Card className="p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-fg">
                  {bill.number ?? t("draft")}
                </h3>
                <BillStatusBadge status={bill.status} />
              </div>
              <p className="mt-1 flex items-center justify-between gap-2 text-sm text-muted">
                <span>{bill.property.name}</span>
                <span className="font-medium tabular-nums text-fg">
                  {formatMoney(bill.grossCents, bill.currency)}
                </span>
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
