import type { BillStatus } from "@domar/shared";
import { useTranslations } from "next-intl";

/** Maps a bill status to a `dom-pill` variant (see globals.css). */
const VARIANT: Record<BillStatus, string> = {
  DRAFT: "draft",
  CONFIRMED: "verified",
};

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const t = useTranslations("bills");
  return (
    <span className={`dom-pill ${VARIANT[status]}`}>
      <span className="dom-pdot" aria-hidden />
      {t(`statusValue.${status}`)}
    </span>
  );
}
