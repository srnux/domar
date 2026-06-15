import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { suggestTurnover } from './turnover-suggestion';

class CreateBookingDto {
  @IsUUID()
  propertyId!: string;

  @IsISO8601()
  checkoutAt!: string;

  @IsOptional()
  @IsISO8601()
  checkinAt?: string;

  @IsOptional()
  @IsString()
  guestNote?: string;
}

class UpdateBookingDto {
  @IsOptional()
  @IsISO8601()
  checkoutAt?: string;

  @IsOptional()
  @IsISO8601()
  checkinAt?: string;

  @IsOptional()
  @IsString()
  guestNote?: string;

  @IsOptional()
  @IsUUID()
  turnoverJobId?: string;
}

const bookingInclude = {
  property: { select: { id: true, name: true } },
} satisfies Prisma.BookingInclude;

type BookingWithProperty = Prisma.BookingGetPayload<{
  include: typeof bookingInclude;
}>;

function toDto(booking: BookingWithProperty) {
  return {
    ...booking,
    // once a job is linked (or the checkout has passed) there is nothing
    // left to suggest
    suggestion:
      booking.turnoverJobId || booking.checkoutAt < new Date()
        ? null
        : suggestTurnover(booking),
  };
}

function assertValidGap(checkoutAt: Date, checkinAt: Date | null) {
  if (checkinAt && checkinAt < checkoutAt) {
    throw new BadRequestException('checkinAt must be after checkoutAt');
  }
}

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR')
export class BookingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const bookings = await this.prisma.booking.findMany({
      where: { checkoutAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
      include: bookingInclude,
      orderBy: { checkoutAt: 'asc' },
    });
    return bookings.map(toDto);
  }

  @Post()
  async create(@Body() dto: CreateBookingDto) {
    // findFirst so the extension scopes by companyId.
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId },
    });
    if (!property || !property.isActive) {
      throw new BadRequestException('Unknown or inactive property');
    }
    const checkoutAt = new Date(dto.checkoutAt);
    const checkinAt = dto.checkinAt ? new Date(dto.checkinAt) : null;
    assertValidGap(checkoutAt, checkinAt);

    const booking = await this.prisma.booking.create({
      data: {
        propertyId: dto.propertyId,
        companyId: property.companyId,
        checkoutAt,
        checkinAt,
        guestNote: dto.guestNote,
      },
      include: bookingInclude,
    });
    return toDto(booking);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    const booking = await this.prisma.booking.findFirst({ where: { id } });
    if (!booking) throw new NotFoundException();

    if (dto.turnoverJobId) {
      const job = await this.prisma.job.findFirst({
        where: { id: dto.turnoverJobId },
      });
      if (!job || job.propertyId !== booking.propertyId) {
        throw new BadRequestException(
          'turnoverJobId must be a job on the same property',
        );
      }
    }

    const checkoutAt = dto.checkoutAt
      ? new Date(dto.checkoutAt)
      : booking.checkoutAt;
    const checkinAt = dto.checkinAt
      ? new Date(dto.checkinAt)
      : booking.checkinAt;
    assertValidGap(checkoutAt, checkinAt);

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        checkoutAt,
        checkinAt,
        guestNote: dto.guestNote,
        turnoverJobId: dto.turnoverJobId,
      },
      include: bookingInclude,
    });
    return toDto(updated);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id } });
    if (!booking) throw new NotFoundException();
    await this.prisma.booking.delete({ where: { id } });
    return { ok: true };
  }
}
