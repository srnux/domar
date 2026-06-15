import { cn } from "./cn";

/**
 * Domar brand mark: a dark rounded square with a "D" and the accent dot —
 * a small nod to the Adriatic sky-blue/green that runs through the palette.
 */
export function BrandMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-[5px] bg-fg font-bold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden
    >
      D
      <span
        className="absolute rounded-full bg-accent ring-2 ring-surface"
        style={{
          width: size * 0.27,
          height: size * 0.27,
          right: -size * 0.08,
          bottom: -size * 0.08,
        }}
      />
    </span>
  );
}

export function Brand({
  size = 22,
  className,
  showName = true,
}: {
  size?: number;
  className?: string;
  showName?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 font-semibold tracking-tight text-fg",
        className,
      )}
    >
      <BrandMark size={size} />
      {showName && <span>Domar</span>}
    </span>
  );
}
