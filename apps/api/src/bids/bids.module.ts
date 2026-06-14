import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { JobsModule } from '../jobs/jobs.module';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

@Module({
  imports: [AuthModule, ActivityModule, JobsModule],
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}
