import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotoKind } from '@prisma/client';
import { MAX_PHOTO_SIZE } from '@domar/shared';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { PhotosService } from './photos.service';

class UploadPhotoDto {
  @IsEnum(PhotoKind)
  kind!: PhotoKind;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsUUID()
  checklistItemId?: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post('jobs/:jobId/photos')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_SIZE } }),
  )
  upload(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadPhotoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.photos.upload(jobId, file, dto.kind, req.user, {
      caption: dto.caption,
      checklistItemId: dto.checklistItemId,
    });
  }

  @Get('photos/:id')
  async stream(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const { stream, mimeType } = await this.photos.stream(id, req.user);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    stream.pipe(res);
  }
}
