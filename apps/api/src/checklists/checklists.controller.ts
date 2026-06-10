import {
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

class ToggleItemDto {
  @IsBoolean()
  done!: boolean;
}

class TemplateItemDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsBoolean()
  photoRequired?: boolean;
}

class UpsertTemplateDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto)
  items!: TemplateItemDto[];
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChecklistsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Toggle a job checklist item — assigned worker or supervisor only. */
  @Patch('checklist-items/:id')
  async toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const item = await this.prisma.checklistItem.findFirst({
      where: {
        id,
        ...(req.user.role === Role.SUPERVISOR
          ? {}
          : { job: { assignedWorkerId: req.user.sub } }),
      },
    });
    if (!item) throw new NotFoundException();
    return this.prisma.checklistItem.update({
      where: { id },
      data: { done: dto.done },
      select: {
        id: true,
        text: true,
        photoRequired: true,
        done: true,
        sortOrder: true,
      },
    });
  }

  /** Replace a property's checklist template (supervisor). */
  @Put('properties/:propertyId/checklist-template')
  @Roles('SUPERVISOR')
  async upsertTemplate(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: UpsertTemplateDto,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException();

    const template = await this.prisma.checklistTemplate.upsert({
      where: { propertyId },
      create: { propertyId },
      update: {},
    });
    await this.prisma.checklistTemplateItem.deleteMany({
      where: { templateId: template.id },
    });
    await this.prisma.checklistTemplateItem.createMany({
      data: dto.items.map((item, i) => ({
        templateId: template.id,
        text: item.text,
        photoRequired: item.photoRequired ?? false,
        sortOrder: i,
      })),
    });
    return this.prisma.checklistTemplateItem.findMany({
      where: { templateId: template.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, text: true, photoRequired: true, sortOrder: true },
    });
  }
}
