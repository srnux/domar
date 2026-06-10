import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Property } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/create-property.dto';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR')
export class PropertiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(): Promise<Property[]> {
    return this.prisma.property.findMany({ orderBy: { name: 'asc' } });
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException();
    return property;
  }

  @Post()
  create(@Body() dto: CreatePropertyDto): Promise<Property> {
    return this.prisma.property.create({ data: dto });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException();
    return this.prisma.property.update({ where: { id }, data: dto });
  }
}
