import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChecklistsController } from './checklists.controller';

@Module({
  imports: [AuthModule],
  controllers: [ChecklistsController],
})
export class ChecklistsModule {}
