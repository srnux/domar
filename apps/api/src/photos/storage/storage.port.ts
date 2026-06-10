import type { Readable } from 'node:stream';

/** Abstraction over photo blob storage; LocalDiskStorage in v1, S3 later. */
export abstract class StoragePort {
  abstract save(filename: string, content: Buffer): Promise<void>;
  abstract read(filename: string): Promise<Readable>;
  abstract delete(filename: string): Promise<void>;
}
