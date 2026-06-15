import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import {
  CreateCompanyDto,
  ReassignOwnerDto,
  UpdateCompanyDto,
} from './dto/admin-company.dto';
import { PlatformAdminGuard } from './platform-admin.guard';

@Controller('admin/companies')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listCompanies();
  }

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.admin.createCompany(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getCompany(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.admin.updateCompany(id, dto);
  }

  @Post(':id/suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.suspend(id);
  }

  @Post(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.activate(id);
  }

  @Patch(':id/owner')
  reassignOwner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignOwnerDto,
  ) {
    return this.admin.reassignOwner(id, dto);
  }
}
