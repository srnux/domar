"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./Button";

/**
 * Confirmation shown when a user tries to navigate away from a form that has
 * unsaved changes. Driven by the navigation blocker; not used directly.
 */
export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  const t = useTranslations("unsavedChanges");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onStay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onStay]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={onStay} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        className="dom-card relative z-10 w-full max-w-sm p-5"
      >
        <h2
          id="unsaved-changes-title"
          className="text-lg font-semibold text-fg"
        >
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("body")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onStay} autoFocus>
            {t("stay")}
          </Button>
          <Button variant="danger" onClick={onLeave}>
            {t("leave")}
          </Button>
        </div>
      </div>
    </div>
  );
}
