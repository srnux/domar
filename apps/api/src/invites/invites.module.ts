import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvitesController } from './invites.controller';

@Module({
  imports: [AuthModule],
  controllers: [InvitesController],
})
export class InvitesModule {}
