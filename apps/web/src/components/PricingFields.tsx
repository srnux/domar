"use client";

import { useTranslations } from "next-intl";
import { CURRENCY_OPTIONS, type PricingFormValue } from "@/lib/pricing";
import { Field, Input, Select } from "@/components/ui";

/** Supervisor pricing inputs, shared by the create form and the edit panel. */
export function PricingFields({
  value,
  onChange,
  allowNegotiable = false,
}: {
  value: PricingFormValue;
  onChange: (next: PricingFormValue) => void;
  /** Offer the "Negotiable" option (create form only — opens the job for bids). */
  allowNegotiable?: boolean;
}) {
  const t = useTranslations("pricing");
  const set = (patch: Partial<PricingFormValue>) =>
    onChange({ ...value, ...patch });
  const hasAmount = value.priceType === "FIXED" || value.priceType === "HOURLY";

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("priceType")}>
        <Select
          value={value.priceType}
          onChange={(e) =>
            set({ priceType: e.target.value as PricingFormValue["priceType"] })
          }
        >
          <option value="">{t("none")}</option>
          <option value="FIXED">{t("fixed")}</option>
          <option value="HOURLY">{t("hourly")}</option>
          {allowNegotiable && (
            <option value="NEGOTIABLE">{t("negotiable")}</option>
          )}
        </Select>
      </Field>

      {value.priceType === "NEGOTIABLE" && (
        <Field label={t("currency")} hint={t("negotiableHint")}>
          <Select
            value={value.currency}
            onChange={(e) => set({ currency: e.target.value })}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {hasAmount && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={value.priceType === "HOURLY" ? t("rate") : t("amount")}>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={value.amount}
              onChange={(e) => set({ amount: e.target.value })}
            />
          </Field>
          <Field label={t("currency")}>
            <Select
              value={value.currency}
              onChange={(e) => set({ currency: e.target.value })}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      {value.priceType === "HOURLY" && (
        <Field label={t("estimatedHours")} hint={t("estimatedHoursHint")}>
          <Input
            type="number"
            min="0"
            step="0.25"
            value={value.estimatedHours}
            onChange={(e) => set({ estimatedHours: e.target.value })}
          />
        </Field>
      )}
    </div>
  );
}
