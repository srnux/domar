import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@domar/shared';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'domar-api',
      timestamp: new Date().toISOString(),
    };
  }
}
