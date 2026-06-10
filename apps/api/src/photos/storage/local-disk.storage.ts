import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile, access } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Readable } from 'node:stream';
import { StoragePort } from './storage.port';

export class LocalDiskStorage extends StoragePort {
  constructor(private readonly dir: string) {
    super();
  }

  private resolve(filename: string): string {
    if (filename !== basename(filename)) {
      throw new Error(`Illegal filename: ${filename}`);
    }
    return join(this.dir, filename);
  }

  async save(filename: string, content: Buffer): Promise<void> {
    const path = this.resolve(filename);
    await mkdir(this.dir, { recursive: true });
    await writeFile(path, content);
  }

  async read(filename: string): Promise<Readable> {
    const path = this.resolve(filename);
    await access(path); // reject before creating a stream that errors late
    return createReadStream(path);
  }

  async delete(filename: string): Promise<void> {
    await unlink(this.resolve(filename));
  }
}
