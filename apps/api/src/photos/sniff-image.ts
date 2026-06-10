const SIGNATURES: Array<{
  mime: string;
  check: (b: Buffer) => boolean;
}> = [
  {
    mime: 'image/jpeg',
    check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    check: (b) =>
      b.length >= 8 &&
      b.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
  },
  {
    mime: 'image/webp',
    check: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

/** Returns the real image mime type by magic bytes, or null if not allowed. */
export function sniffImageType(buffer: Buffer): string | null {
  return SIGNATURES.find((s) => s.check(buffer))?.mime ?? null;
}
