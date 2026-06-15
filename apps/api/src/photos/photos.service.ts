import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhotoKind, Role } from '@prisma/client';
import type { AccessTokenPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { sniffImageType } from './sniff-image';
import { StoragePort } from './storage/storage.port';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const photoSelect = {
  id: true,
  kind: true,
  caption: true,
  checklistItemId: true,
  uploadedById: true,
  createdAt: true,
} as const;

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StoragePort,
    private readonly tenantContext: TenantContextService,
  ) {}

  /** Upload by the assigned worker or a supervisor. */
  async upload(
    jobId: string,
    file: { buffer: Buffer; size: number },
    kind: PhotoKind,
    actor: AccessTokenPayload,
    options: { caption?: string; checklistItemId?: string } = {},
  ) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        ...(actor.role === Role.SUPERVISOR
          ? {}
          : { assignedWorkerId: actor.sub }),
      },
    });
    if (!job) throw new NotFoundException();

    const mime = sniffImageType(file.buffer);
    if (!mime) {
      throw new BadRequestException('File is not a JPEG, PNG, or WebP image');
    }

    if (options.checklistItemId) {
      const item = await this.prisma.checklistItem.findFirst({
        where: { id: options.checklistItemId, jobId },
      });
      if (!item) {
        throw new BadRequestException('checklistItemId is not on this job');
      }
    }

    const filename = `${randomUUID()}.${EXTENSIONS[mime]}`;
    await this.storage.save(filename, file.buffer);

    return this.prisma.jobPhoto.create({
      data: {
        jobId,
        kind,
        filename,
        mimeType: mime,
        sizeBytes: file.size,
        caption: options.caption,
        checklistItemId: options.checklistItemId,
        uploadedById: actor.sub,
      },
      select: photoSelect,
    });
  }

  /** Stream a photo to anyone allowed to see its job. */
  async stream(
    id: string,
    actor: AccessTokenPayload,
  ): Promise<{ stream: Readable; mimeType: string }> {
    // JobPhoto is transitive (no companyId); scope through the job's company.
    const companyId = this.tenantContext.getCompanyIdOrThrow();
    const photo = await this.prisma.jobPhoto.findFirst({
      where: {
        id,
        job: {
          companyId,
          ...(actor.role === Role.WORKER
            ? { assignedWorkerId: actor.sub }
            : actor.role === Role.OWNER
              ? { property: { ownerId: actor.sub } }
              : {}),
        },
      },
    });
    if (!photo) throw new NotFoundException();

    return {
      stream: await this.storage.read(photo.filename),
      mimeType: photo.mimeType,
    };
  }
}
