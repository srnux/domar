import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_PHOTO_SIZE } from '@domar/shared';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { AvatarService } from './avatar.service';

/**
 * Self-service avatars, available to every authenticated role — kept off the
 * supervisor-only UsersController so it isn't gated by the RolesGuard.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class AvatarController {
  constructor(private readonly avatars: AvatarService) {}

  @Put('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_SIZE } }),
  )
  update(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.avatars.update(req.user.sub, file);
  }

  @Get(':id/avatar')
  async stream(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType } = await this.avatars.stream(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    stream.pipe(res);
  }
}
