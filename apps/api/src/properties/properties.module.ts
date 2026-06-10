import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertiesController } from './properties.controller';

@Module({
  imports: [AuthModule],
  controllers: [PropertiesController],
})
export class PropertiesModule {}
