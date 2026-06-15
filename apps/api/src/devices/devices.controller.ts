import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @HttpCode(200)
  register(@Body() dto: RegisterDeviceDto, @Req() req: AuthenticatedRequest) {
    return this.devices.register(req.user.sub, req.user.companyId ?? null, dto);
  }

  @Delete(':token')
  @HttpCode(200)
  unregister(
    @Param('token') token: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.devices.unregister(req.user.sub, token);
  }
}
