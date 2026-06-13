import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateRatingDto } from './dto/create-rating.dto';
import { RatingsService } from './ratings.service';

@Controller('jobs/:jobId/rating')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Post()
  @Roles('OWNER')
  rate(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CreateRatingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ratings.rate(jobId, dto, req.user);
  }
}
