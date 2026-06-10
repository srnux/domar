"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui";

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
  label: React.ReactNode;
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
      <span className="flex-1 text-sm font-medium text-fg-soft">{label}</span>
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
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
      >
        <Camera size={18} aria-hidden /> {t("camera")}
      </Button>
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        onClick={() => libraryRef.current?.click()}
      >
        <ImageIcon size={18} aria-hidden /> {t("library")}
      </Button>
    </div>
  );
}
