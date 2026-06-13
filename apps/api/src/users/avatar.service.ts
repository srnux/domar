import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sniffImageType } from '../photos/sniff-image';
import { StoragePort } from '../photos/storage/storage.port';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class AvatarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StoragePort,
  ) {}

  /** Replace the caller's own avatar with the uploaded image. */
  async update(userId: string, file: { buffer: Buffer }) {
    const mime = sniffImageType(file.buffer);
    if (!mime) {
      throw new BadRequestException('File is not a JPEG, PNG, or WebP image');
    }

    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarFilename: true },
    });
    if (!current) throw new NotFoundException();

    const filename = `${randomUUID()}.${EXTENSIONS[mime]}`;
    await this.storage.save(filename, file.buffer);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarFilename: filename },
      omit: { passwordHash: true },
    });

    // Best-effort cleanup of the previous file; never block the response on it.
    if (current.avatarFilename) {
      await this.storage.delete(current.avatarFilename).catch(() => undefined);
    }

    return user;
  }

  /** Stream any user's avatar; 404 when they have none. */
  async stream(
    userId: string,
  ): Promise<{ stream: Readable; mimeType: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarFilename: true },
    });
    if (!user?.avatarFilename) throw new NotFoundException();

    const ext = user.avatarFilename.split('.').pop() ?? '';
    const mimeType =
      Object.entries(EXTENSIONS).find(([, e]) => e === ext)?.[0] ??
      'application/octet-stream';

    return {
      stream: await this.storage.read(user.avatarFilename),
      mimeType,
    };
  }
}
