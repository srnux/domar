import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateJobDto } from './dto/create-job.dto';
import { TransitionJobDto } from './dto/transition-job.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  @Roles('SUPERVISOR')
  create(@Body() dto: CreateJobDto, @Req() req: AuthenticatedRequest) {
    return this.jobs.create(dto, req.user);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.jobs.list(req.user);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.jobs.get(id, req.user);
  }

  @Patch(':id/transition')
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionJobDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.jobs.transition(id, dto, req.user);
  }
}
