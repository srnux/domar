"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { BillDto, BillLineItemDto } from "@domar/shared";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { BillStatusBadge } from "@/components/BillStatusBadge";
import {
  useAddJobLines,
  useAddLineItem,
  useBill,
  useConfirmBill,
  useDeleteBill,
  useDeleteLineItem,
  useEligibleJobs,
} from "@/lib/bills";
import { formatMoney } from "@/lib/pricing";
import {
  Button,
  Callout,
  Card,
  CardHeader,
  Field,
  Input,
  PageSpinner,
} from "@/components/ui";

export default function BillBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("bills");
  const router = useRouter();
  const { data: bill, isPending } = useBill(id);

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
        onClick={() => router.push("/manage/bills")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden /> {t("title")}
      </button>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {bill.number ?? t("draft")}
          </h1>
          <p className="mt-1 text-sm text-muted">{bill.property.name}</p>
        </div>
        <BillStatusBadge status={bill.status} />
      </div>

      {bill.status === "CONFIRMED" ? (
        <ConfirmedView bill={bill} />
      ) : (
        <DraftEditor bill={bill} />
      )}
    </main>
  );
}

function ConfirmedView({ bill }: { bill: BillDto }) {
  const t = useTranslations("bills");
  return (
    <>
      <Callout variant="success" className="mb-4">
        {t("confirmedHint")}
      </Callout>
      <Card>
        <div className="divide-y divide-border">
          {bill.lineItems.map((li) => (
            <LineRow key={li.id} line={li} currency={bill.currency} />
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
    </>
  );
}

function DraftEditor({ bill }: { bill: BillDto }) {
  const t = useTranslations("bills");
  const router = useRouter();
  const addJobLines = useAddJobLines(bill.id);
  const addLineItem = useAddLineItem(bill.id);
  const removeLineItem = useDeleteLineItem(bill.id);
  const confirmBill = useConfirmBill(bill.id);
  const deleteBill = useDeleteBill();

  const jobLines = bill.lineItems.filter((li) => li.kind === "JOB");
  const additionalLines = bill.lineItems.filter(
    (li) => li.kind === "ADDITIONAL",
  );

  const onBillJobIds = useMemo(
    () => new Set(jobLines.map((li) => li.jobId)),
    [jobLines],
  );
  const { data: eligible } = useEligibleJobs(bill.property.id, bill.currency);
  const remainingJobs = (eligible ?? []).filter(
    (j) => !onBillJobIds.has(j.id),
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (jobId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });

  const addSelectedJobs = () => {
    if (selected.size === 0) return;
    addJobLines.mutate(
      { jobIds: [...selected] },
      { onSuccess: () => setSelected(new Set()) },
    );
  };

  // Manual line form
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || amount.trim() === "") return;
    addLineItem.mutate(
      {
        label: label.trim(),
        unitAmountCents: Math.round(parseFloat(amount) * 100),
      },
      {
        onSuccess: () => {
          setLabel("");
          setAmount("");
        },
      },
    );
  };

  const error =
    addJobLines.error ?? addLineItem.error ?? confirmBill.error ?? null;

  return (
    <>
      {error && (
        <Callout variant="declined" className="mb-4">
          {error.message}
        </Callout>
      )}

      {/* Job costs */}
      <Card className="mb-4">
        <CardHeader title={t("jobCosts")} count={jobLines.length} />
        <div className="divide-y divide-border">
          {jobLines.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted">{t("noJobLines")}</p>
          )}
          {jobLines.map((li) => (
            <LineRow
              key={li.id}
              line={li}
              currency={bill.currency}
              onRemove={() => removeLineItem.mutate(li.id)}
            />
          ))}
        </div>
      </Card>

      {/* Add eligible jobs */}
      {remainingJobs.length > 0 && (
        <Card className="mb-4">
          <CardHeader title={t("eligibleJobs")} count={remainingJobs.length} />
          <div className="divide-y divide-border">
            {remainingJobs.map((j) => {
              const total =
                j.priceType === "HOURLY"
                  ? Math.round((j.priceCents ?? 0) * (j.spentHours ?? 0))
                  : (j.priceCents ?? 0);
              return (
                <label
                  key={j.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(j.id)}
                    onChange={() => toggle(j.id)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <span className="flex-1 text-fg">{j.title}</span>
                  <span className="tabular-nums text-muted">
                    {formatMoney(total, j.currency)}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="border-t border-border px-4 py-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={addSelectedJobs}
              loading={addJobLines.isPending}
              disabled={selected.size === 0}
            >
              <Plus size={14} aria-hidden /> {t("addJobs")}
            </Button>
          </div>
        </Card>
      )}

      {/* Additional costs */}
      <Card className="mb-4">
        <CardHeader title={t("additionalCosts")} count={additionalLines.length} />
        <div className="divide-y divide-border">
          {additionalLines.map((li) => (
            <LineRow
              key={li.id}
              line={li}
              currency={bill.currency}
              onRemove={() => removeLineItem.mutate(li.id)}
            />
          ))}
        </div>
        <form
          onSubmit={addManual}
          className="flex flex-wrap items-end gap-2 border-t border-border px-4 py-3"
        >
          <Field label={t("label")} className="min-w-[10rem] flex-1">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("labelPlaceholder")}
            />
          </Field>
          <Field label={`${t("amount")} (${bill.currency})`} className="w-32">
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Button
            type="submit"
            variant="secondary"
            loading={addLineItem.isPending}
            disabled={!label.trim() || amount.trim() === ""}
          >
            <Plus size={14} aria-hidden /> {t("addLineItem")}
          </Button>
        </form>
      </Card>

      {/* Totals */}
      <Card className="mb-4">
        <Totals bill={bill} />
      </Card>

      <Callout variant="info" className="mb-4">
        {t("confirmHint")}
      </Callout>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="danger"
          onClick={() =>
            deleteBill.mutate(bill.id, {
              onSuccess: () => router.replace("/manage/bills"),
            })
          }
          loading={deleteBill.isPending}
        >
          <Trash2 size={16} aria-hidden /> {t("delete")}
        </Button>
        <Button
          variant="primary"
          onClick={() => confirmBill.mutate()}
          loading={confirmBill.isPending}
          disabled={bill.lineItems.length === 0}
        >
          {t("confirm")}
        </Button>
      </div>
    </>
  );
}

function LineRow({
  line,
  currency,
  onRemove,
}: {
  line: BillLineItemDto;
  currency: string;
  onRemove?: () => void;
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
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove"
          className="text-subtle hover:text-st-declined"
        >
          <Trash2 size={15} aria-hidden />
        </button>
      )}
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
