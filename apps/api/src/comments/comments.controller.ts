import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentVisibility } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';

class CreateCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsEnum(CommentVisibility)
  visibility!: CommentVisibility;
}

@Controller('jobs/:jobId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.comments.list(jobId, req.user);
  }

  @Post()
  create(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.comments.create(jobId, dto.body, dto.visibility, req.user);
  }
}
