import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api-client";

/**
 * Renders an API-served photo that needs a Bearer header. A plain <img> can't
 * send Authorization, and the photo endpoint isn't same-origin on mobile, so we
 * fetch the bytes and hand the <img> an object URL (revoked on unmount).
 */
export function AuthImage({
  photoId,
  alt,
  title,
  className,
}: {
  photoId: string;
  alt: string;
  title?: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    authedFetch(`/api/photos/${photoId}`)
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        /* leave the placeholder in place on failure */
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  return (
    <img
      src={url}
      alt={alt}
      title={title}
      className={className}
      style={!url ? { backgroundColor: "var(--color-surface-2)" } : undefined}
    />
  );
}
