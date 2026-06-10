import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDiskStorage } from './local-disk.storage';

describe('LocalDiskStorage', () => {
  let dir: string;
  let storage: LocalDiskStorage;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'domar-storage-'));
    storage = new LocalDiskStorage(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('round-trips a file', async () => {
    const content = Buffer.from('fake image bytes');

    await storage.save('abc.jpg', content);
    const stream = await storage.read('abc.jpg');

    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('fake image bytes');
  });

  it('creates the directory if missing', async () => {
    const nested = new LocalDiskStorage(join(dir, 'does/not/exist'));
    await nested.save('x.jpg', Buffer.from('x'));
    const stream = await nested.read('x.jpg');
    stream.destroy();
  });

  it('deletes a file', async () => {
    await storage.save('gone.jpg', Buffer.from('x'));
    await storage.delete('gone.jpg');
    await expect(storage.read('gone.jpg')).rejects.toThrow();
  });

  it('refuses path traversal in filenames', async () => {
    await expect(
      storage.save('../escape.jpg', Buffer.from('x')),
    ).rejects.toThrow();
    await expect(storage.read('..\\escape.jpg')).rejects.toThrow();
  });
});
