"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BidDto, PriceType } from "@domar/shared";
import { useSubmitBid, useWithdrawBid } from "@/lib/bids";
import { formatMoney } from "@/lib/pricing";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

const STATUS_TONE: Record<BidDto["status"], string> = {
  PENDING: "text-muted",
  ACCEPTED: "text-st-progress",
  REJECTED: "text-st-declined",
};

/** Worker's submit/revise/withdraw control for a single negotiable job. */
export function BidForm({
  jobId,
  currency,
  myBid,
}: {
  jobId: string;
  currency: string;
  myBid: BidDto | null;
}) {
  const t = useTranslations("bids");
  const submit = useSubmitBid(jobId);
  const withdraw = useWithdrawBid(jobId);

  const [priceType, setPriceType] = useState<PriceType>(
    myBid?.priceType ?? "FIXED",
  );
  const [amount, setAmount] = useState(
    myBid ? String(myBid.amountCents / 100) : "",
  );
  const [message, setMessage] = useState(myBid?.message ?? "");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit.mutate({
      priceType,
      amountCents: Math.round(parseFloat(amount || "0") * 100),
      message: message.trim() || undefined,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {myBid && (
        <p className="text-sm text-muted">
          {t("yourBid", {
            amount: formatMoney(myBid.amountCents, currency),
          })}{" "}
          <span className={`font-medium ${STATUS_TONE[myBid.status]}`}>
            {t(`status.${myBid.status}`)}
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("bidType")}>
          <Select
            value={priceType}
            onChange={(e) => setPriceType(e.target.value as PriceType)}
          >
            <option value="FIXED">{t("fixed")}</option>
            <option value="HOURLY">{t("hourly")}</option>
          </Select>
        </Field>
        <Field label={priceType === "HOURLY" ? t("rate") : t("amount")}>
          <Input
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("message")}>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </Field>

      {submit.isError && (
        <p role="alert" className="text-sm text-st-declined">
          {submit.error.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={submit.isPending}
          loading={submit.isPending}
        >
          {myBid ? t("update") : t("submit")}
        </Button>
        {myBid && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => withdraw.mutate(myBid.id)}
            disabled={withdraw.isPending}
          >
            {t("withdraw")}
          </Button>
        )}
      </div>
    </form>
  );
}
