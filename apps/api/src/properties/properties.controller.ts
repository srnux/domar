import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role, type Property } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/create-property.dto';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly prisma: PrismaService) {}

  /** Owners see their own properties; supervisors see all. */
  private scopeFor(req: AuthenticatedRequest) {
    return req.user.role === Role.OWNER ? { ownerId: req.user.sub } : {};
  }

  @Get()
  @Roles('SUPERVISOR', 'OWNER')
  list(@Req() req: AuthenticatedRequest): Promise<Property[]> {
    return this.prisma.property.findMany({
      where: this.scopeFor(req),
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id')
  @Roles('SUPERVISOR', 'OWNER')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Property> {
    const property = await this.prisma.property.findFirst({
      where: { id, ...this.scopeFor(req) },
    });
    if (!property) throw new NotFoundException();
    return property;
  }

  @Get(':id/checklist-template')
  @Roles('SUPERVISOR')
  async getTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.checklistTemplateItem.findMany({
      where: { template: { propertyId: id } },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, text: true, photoRequired: true, sortOrder: true },
    });
  }

  @Post()
  @Roles('SUPERVISOR')
  create(@Body() dto: CreatePropertyDto): Promise<Property> {
    return this.prisma.property.create({ data: dto });
  }

  @Patch(':id')
  @Roles('SUPERVISOR')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<Property> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException();
    return this.prisma.property.update({ where: { id }, data: dto });
  }
}
