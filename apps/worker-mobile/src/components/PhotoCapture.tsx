"use client";

import { useRef } from "react";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { useTranslations } from "next-intl";
import { Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui";

const native = Capacitor.isNativePlatform();

/** Convert a Capacitor camera data URL into a File for the existing upload path. */
async function dataUrlToFile(dataUrl: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });
}

/**
 * Picks a photo and hands a File to `onPick`. On native (Capacitor) it uses the
 * device camera / gallery via @capacitor/camera, which delivers JPEG (so iPhone
 * HEIC is converted for us); on web it falls back to file inputs — `capture`
 * forces the camera on phones, with the library as a separate input.
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

  async function pickNative(source: CameraSource) {
    try {
      const photo = await CapCamera.getPhoto({
        source,
        resultType: CameraResultType.DataUrl,
        quality: 90,
        correctOrientation: true,
      });
      if (photo.dataUrl) onPick(await dataUrlToFile(photo.dataUrl));
    } catch {
      /* user cancelled the picker */
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm font-medium text-fg-soft">{label}</span>
      {!native && (
        <>
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
        </>
      )}
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        onClick={() =>
          native ? pickNative(CameraSource.Camera) : cameraRef.current?.click()
        }
      >
        <Camera size={18} aria-hidden /> {t("camera")}
      </Button>
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        onClick={() =>
          native ? pickNative(CameraSource.Photos) : libraryRef.current?.click()
        }
      >
        <ImageIcon size={18} aria-hidden /> {t("library")}
      </Button>
    </div>
  );
}
