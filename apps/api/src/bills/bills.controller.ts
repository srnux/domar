import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BillPdfService } from './bill-pdf.service';
import { BillsService } from './bills.service';
import { AddJobLinesDto } from './dto/add-job-lines.dto';
import { AddLineItemDto } from './dto/add-line-item.dto';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';

@Controller('bills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillsController {
  constructor(
    private readonly bills: BillsService,
    private readonly pdf: BillPdfService,
  ) {}

  @Post()
  @Roles('SUPERVISOR')
  create(@Body() dto: CreateBillDto, @Req() req: AuthenticatedRequest) {
    return this.bills.create(dto, req.user);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.bills.list(req.user);
  }

  // Literal route must precede the ':id' (ParseUUIDPipe) route to match.
  @Get('eligible-jobs')
  @Roles('SUPERVISOR')
  eligibleJobs(
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('currency') currency?: string,
  ) {
    return this.bills.eligibleJobs(propertyId, currency ?? 'EUR');
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.bills.get(id, req.user);
  }

  @Get(':id/pdf')
  async pdfStream(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const bill = await this.bills.get(id, req.user);
    const buffer = await this.pdf.render(bill);
    const filename = `${bill.number ?? 'bill'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Patch(':id')
  @Roles('SUPERVISOR')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBillDto) {
    return this.bills.update(id, dto);
  }

  @Post(':id/jobs')
  @Roles('SUPERVISOR')
  addJobLines(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddJobLinesDto,
  ) {
    return this.bills.addJobLines(id, dto);
  }

  @Post(':id/line-items')
  @Roles('SUPERVISOR')
  addLineItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLineItemDto,
  ) {
    return this.bills.addLineItem(id, dto);
  }

  @Patch(':id/line-items/:lineId')
  @Roles('SUPERVISOR')
  updateLineItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateLineItemDto,
  ) {
    return this.bills.updateLineItem(id, lineId, dto);
  }

  @Delete(':id/line-items/:lineId')
  @Roles('SUPERVISOR')
  removeLineItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ) {
    return this.bills.removeLineItem(id, lineId);
  }

  @Post(':id/confirm')
  @Roles('SUPERVISOR')
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.bills.confirm(id);
  }

  @Delete(':id')
  @Roles('SUPERVISOR')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bills.remove(id);
  }
}
