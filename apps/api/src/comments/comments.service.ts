import { Injectable, NotFoundException } from '@nestjs/common';
import { CommentVisibility, Prisma, Role } from '@prisma/client';
import type { AccessTokenPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

const commentSelect = {
  id: true,
  body: true,
  visibility: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} satisfies Prisma.JobCommentSelect;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Same visibility scope as jobs: worker = assigned, owner = own property. */
  private jobScope(actor: AccessTokenPayload): Prisma.JobWhereInput {
    switch (actor.role) {
      case Role.SUPERVISOR:
        return {};
      case Role.WORKER:
        return { assignedWorkerId: actor.sub };
      case Role.OWNER:
        return { property: { ownerId: actor.sub } };
    }
  }

  private async assertJobVisible(jobId: string, actor: AccessTokenPayload) {
    const job = await this.prisma.job.findFirst({
      where: { AND: [{ id: jobId }, this.jobScope(actor)] },
      select: { id: true },
    });
    if (!job) throw new NotFoundException();
  }

  async list(jobId: string, actor: AccessTokenPayload) {
    await this.assertJobVisible(jobId, actor);
    return this.prisma.jobComment.findMany({
      where: {
        jobId,
        ...(actor.role === Role.OWNER
          ? { visibility: CommentVisibility.SHARED }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: commentSelect,
    });
  }

  async create(
    jobId: string,
    body: string,
    visibility: CommentVisibility,
    actor: AccessTokenPayload,
  ) {
    await this.assertJobVisible(jobId, actor);
    return this.prisma.jobComment.create({
      data: {
        jobId,
        body,
        // owners cannot whisper to themselves — everything they write is
        // visible to supervisor and worker anyway, so force SHARED
        visibility:
          actor.role === Role.OWNER ? CommentVisibility.SHARED : visibility,
        authorId: actor.sub,
      },
      select: commentSelect,
    });
  }
}
