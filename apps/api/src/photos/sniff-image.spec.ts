import { sniffImageType } from './sniff-image';

describe('sniffImageType', () => {
  it('detects JPEG by magic bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(sniffImageType(jpeg)).toBe('image/jpeg');
  });

  it('detects PNG', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffImageType(png)).toBe('image/png');
  });

  it('detects WebP (RIFF....WEBP)', () => {
    const webp = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP'),
    ]);
    expect(sniffImageType(webp)).toBe('image/webp');
  });

  it('returns null for anything else', () => {
    expect(sniffImageType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
    expect(sniffImageType(Buffer.from('GIF89a'))).toBeNull();
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
    expect(sniffImageType(Buffer.from([0xff]))).toBeNull();
  });
});
