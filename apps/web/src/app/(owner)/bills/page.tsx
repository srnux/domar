"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronRight, ReceiptText } from "lucide-react";
import { useBills } from "@/lib/bills";
import { formatMoney } from "@/lib/pricing";
import { Card, EmptyState, PageSpinner } from "@/components/ui";

export default function OwnerBillsPage() {
  const t = useTranslations("bills");
  const router = useRouter();
  const { data: bills, isPending } = useBills();

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <button
        onClick={() => router.back()}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden /> {t("back")}
      </button>
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">
        {t("title")}
      </h1>

      {isPending && <PageSpinner />}

      {!isPending && (bills ?? []).length === 0 && (
        <EmptyState
          icon={<ReceiptText size={22} aria-hidden />}
          title={t("noBills")}
        />
      )}

      <div className="flex flex-col gap-3">
        {(bills ?? []).map((bill) => (
          <Link key={bill.id} href={`/bills/${bill.id}`} className="block">
            <Card className="p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-fg">{bill.number}</h3>
                <ChevronRight size={16} className="text-subtle" aria-hidden />
              </div>
              <p className="mt-1 flex items-center justify-between gap-2 text-sm text-muted">
                <span>
                  {bill.property.name}
                  {bill.confirmedAt
                    ? ` · ${new Date(bill.confirmedAt).toLocaleDateString("en-GB")}`
                    : ""}
                </span>
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
