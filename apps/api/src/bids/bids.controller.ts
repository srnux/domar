import {
  Body,
  Controller,
  Delete,
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
import { BidsService } from './bids.service';
import { SubmitBidDto } from './dto/submit-bid.dto';

@Controller('jobs/:jobId/bids')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BidsController {
  constructor(private readonly bids: BidsService) {}

  @Get()
  @Roles('SUPERVISOR', 'WORKER')
  list(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bids.list(jobId, req.user);
  }

  @Post()
  @Roles('WORKER')
  submit(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: SubmitBidDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bids.submit(jobId, dto, req.user);
  }

  @Delete(':bidId')
  @Roles('WORKER')
  withdraw(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('bidId', ParseUUIDPipe) bidId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bids.withdraw(jobId, bidId, req.user);
  }

  @Patch(':bidId/accept')
  @Roles('SUPERVISOR')
  accept(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('bidId', ParseUUIDPipe) bidId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bids.accept(jobId, bidId, req.user);
  }
}
