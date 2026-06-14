import type { JobDto, JobPricingInput, PriceType } from "@domar/shared";

/** Currencies offered in the pricing selector (ISO 4217). */
export const CURRENCY_OPTIONS = ["EUR", "USD", "GBP", "CHF", "HRK"] as const;

/** Controlled form state for the pricing inputs (amounts in major units). */
export interface PricingFormValue {
  /** "" means no price. */
  priceType: "" | "FIXED" | "HOURLY";
  /** Total (FIXED) or per-hour rate (HOURLY), in major units as typed. */
  amount: string;
  currency: string;
  /** HOURLY only. */
  estimatedHours: string;
}

export const EMPTY_PRICING: PricingFormValue = {
  priceType: "",
  amount: "",
  currency: "EUR",
  estimatedHours: "",
};

/** Seed the pricing form from an existing job. */
export function pricingFromJob(job: JobDto): PricingFormValue {
  return {
    priceType: job.priceType === "NEGOTIABLE" ? "" : (job.priceType ?? ""),
    amount: job.priceCents != null ? String(job.priceCents / 100) : "",
    currency: job.currency,
    estimatedHours: job.estimatedHours != null ? String(job.estimatedHours) : "",
  };
}

/** Convert form state to the API payload, dropping fields that don't apply. */
export function pricingToPayload(value: PricingFormValue): JobPricingInput {
  if (!value.priceType) {
    // Clearing the price: send an explicit null-equivalent so an edit can unset it.
    return { priceType: undefined, priceCents: undefined };
  }
  const payload: JobPricingInput = {
    priceType: value.priceType as PriceType,
    priceCents: Math.round(parseFloat(value.amount || "0") * 100),
    currency: value.currency,
  };
  if (value.priceType === "HOURLY" && value.estimatedHours.trim() !== "") {
    payload.estimatedHours = parseFloat(value.estimatedHours);
  }
  return payload;
}

/** Format integer minor units (cents) as a localized currency string. */
export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Compact price for cards/lists: the fixed total, or the hourly rate suffixed
 * with "/hr". Returns null when the job has no price.
 */
export function priceLabel(job: JobDto): string | null {
  if (!job.priceType || job.priceCents == null) return null;
  const amount = formatMoney(job.priceCents, job.currency);
  return job.priceType === "HOURLY" ? `${amount}/hr` : amount;
}

export interface PriceLine {
  label: "fixed" | "rate" | "estimatedTotal" | "finalTotal";
  /** Pre-formatted currency amount. */
  amount: string;
}

/**
 * Detail-page breakdown. Fixed jobs yield a single total; hourly jobs yield the
 * rate plus a derived estimated total (rate × estimatedHours) and, once the
 * worker logs their hours, a final total (rate × spentHours).
 */
export function priceLines(job: JobDto): PriceLine[] {
  if (!job.priceType || job.priceCents == null) return [];
  const { priceCents, currency } = job;

  if (job.priceType === "FIXED") {
    return [{ label: "fixed", amount: formatMoney(priceCents, currency) }];
  }

  const lines: PriceLine[] = [
    { label: "rate", amount: `${formatMoney(priceCents, currency)}/hr` },
  ];
  if (job.estimatedHours != null) {
    lines.push({
      label: "estimatedTotal",
      amount: formatMoney(Math.round(priceCents * job.estimatedHours), currency),
    });
  }
  if (job.spentHours != null) {
    lines.push({
      label: "finalTotal",
      amount: formatMoney(Math.round(priceCents * job.spentHours), currency),
    });
  }
  return lines;
}
