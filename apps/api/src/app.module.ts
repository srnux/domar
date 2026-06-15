import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantContextMiddleware } from './prisma/tenant.middleware';
import { ActivityModule } from './activity/activity.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BidsModule } from './bids/bids.module';
import { BillsModule } from './bills/bills.module';
import { BookingsModule } from './bookings/bookings.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { CommentsModule } from './comments/comments.module';
import { HealthController } from './health/health.controller';
import { InvitesModule } from './invites/invites.module';
import { JobsModule } from './jobs/jobs.module';
import { LicenseModule } from './license/license.module';
import { PhotosModule } from './photos/photos.module';
import { PrismaModule } from './prisma/prisma.module';
import { PropertiesModule } from './properties/properties.module';
import { RatingsModule } from './ratings/ratings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LicenseModule,
    AuthModule,
    JobsModule,
    BidsModule,
    BillsModule,
    PropertiesModule,
    UsersModule,
    ChecklistsModule,
    PhotosModule,
    CommentsModule,
    RatingsModule,
    BookingsModule,
    InvitesModule,
    ActivityModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Establishes the tenant ALS scope for every request (before guards).
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
