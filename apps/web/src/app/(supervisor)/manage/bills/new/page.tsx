"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { useCreateBill } from "@/lib/bills";
import { useProperties } from "@/lib/jobs";
import { CURRENCY_OPTIONS } from "@/lib/pricing";
import { Button, Callout, Field, Input, Select } from "@/components/ui";

export default function NewBillPage() {
  const t = useTranslations("bills");
  const router = useRouter();
  const { data: properties } = useProperties();
  const createBill = useCreateBill();

  const [propertyId, setPropertyId] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [taxPercent, setTaxPercent] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;
    const taxRateBps =
      taxPercent.trim() !== ""
        ? Math.round(parseFloat(taxPercent) * 100)
        : undefined;
    createBill.mutate(
      { propertyId, currency, taxRateBps },
      { onSuccess: (bill) => router.replace(`/manage/bills/${bill.id}`) },
    );
  };

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <button
        onClick={() => router.back()}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden /> {t("back")}
      </button>
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">
        {t("newBill")}
      </h1>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("selectProperty")}>
          <Select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            required
          >
            <option value="" disabled>
              {t("selectProperty")}
            </option>
            {(properties ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("currency")}>
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("taxRate")} hint={t("taxRateHint")}>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            inputMode="decimal"
            value={taxPercent}
            onChange={(e) => setTaxPercent(e.target.value)}
            placeholder="19"
          />
        </Field>

        {createBill.error && (
          <Callout variant="declined">{createBill.error.message}</Callout>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            loading={createBill.isPending}
            disabled={!propertyId}
          >
            {t("newBill")}
          </Button>
        </div>
      </form>
    </main>
  );
}
