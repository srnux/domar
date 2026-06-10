"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

/**
 * Two separate inputs: `capture` forces the camera on phones (and removes
 * the gallery option on iOS), so the library picker is its own input.
 */
export function PhotoCapture({
  onPick,
  disabled,
  label,
}: {
  onPick: (file: File) => void;
  disabled?: boolean;
  label: string;
}) {
  const t = useTranslations("photos");
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm font-medium">{label}</span>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handle}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handle}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        📷 {t("camera")}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => libraryRef.current?.click()}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        🖼 {t("library")}
      </button>
    </div>
  );
}
